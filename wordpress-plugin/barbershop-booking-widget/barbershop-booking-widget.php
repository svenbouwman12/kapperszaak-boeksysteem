<?php
/**
 * Plugin Name: Barbershop Booking Widget
 * Plugin URI: https://yourwebsite.com
 * Description: Integreert het barbershop boekingsysteem als widget en shortcode in WordPress
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: barbershop-booking-widget
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BARBERSHOP_BOOKING_VERSION', '1.0.0');
define('BARBERSHOP_BOOKING_PLUGIN_URL', plugin_dir_url(__FILE__));
define('BARBERSHOP_BOOKING_PLUGIN_PATH', plugin_dir_path(__FILE__));

/**
 * Main plugin class
 */
class BarbershopBookingWidget {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // Widget registration
        add_action('widgets_init', array($this, 'register_widget'));
        
        // Shortcode registration
        add_shortcode('barbershop_booking', array($this, 'booking_shortcode'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Settings API
        add_action('admin_init', array($this, 'settings_init'));
        
        // AJAX handlers
        add_action('wp_ajax_barbershop_booking_data', array($this, 'ajax_booking_data'));
        add_action('wp_ajax_nopriv_barbershop_booking_data', array($this, 'ajax_booking_data'));
    }
    
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('barbershop-booking-widget', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function enqueue_scripts() {
        // Only enqueue on pages that use the widget or shortcode
        if ($this->should_enqueue_scripts()) {
            wp_enqueue_style(
                'barbershop-booking-style',
                BARBERSHOP_BOOKING_PLUGIN_URL . 'assets/css/booking-widget.css',
                array(),
                BARBERSHOP_BOOKING_VERSION
            );
            
            wp_enqueue_script(
                'barbershop-booking-script',
                BARBERSHOP_BOOKING_PLUGIN_URL . 'assets/js/booking-widget.js',
                array('jquery'),
                BARBERSHOP_BOOKING_VERSION,
                true
            );
            
            // Localize script with WordPress data
            wp_localize_script('barbershop-booking-script', 'barbershopBooking', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('barbershop_booking_nonce'),
                'settings' => $this->get_settings(),
                'strings' => array(
                    'loading' => __('Laden...', 'barbershop-booking-widget'),
                    'error' => __('Er is een fout opgetreden', 'barbershop-booking-widget'),
                    'selectDate' => __('Selecteer een datum', 'barbershop-booking-widget'),
                    'selectTime' => __('Selecteer een tijd', 'barbershop-booking-widget'),
                    'selectService' => __('Selecteer een dienst', 'barbershop-booking-widget'),
                    'selectBarber' => __('Selecteer een kapper', 'barbershop-booking-widget'),
                    'bookingSuccess' => __('Boeking succesvol!', 'barbershop-booking-widget'),
                    'bookingFailed' => __('Boeking mislukt. Probeer opnieuw.', 'barbershop-booking-widget')
                )
            ));
        }
    }
    
    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'barbershop-booking') !== false) {
            wp_enqueue_style(
                'barbershop-booking-admin-style',
                BARBERSHOP_BOOKING_PLUGIN_URL . 'assets/css/admin.css',
                array(),
                BARBERSHOP_BOOKING_VERSION
            );
        }
    }
    
    public function register_widget() {
        require_once BARBERSHOP_BOOKING_PLUGIN_PATH . 'includes/class-booking-widget.php';
        register_widget('Barbershop_Booking_Widget');
    }
    
    public function booking_shortcode($atts) {
        $atts = shortcode_atts(array(
            'title' => __('Boek een afspraak', 'barbershop-booking-widget'),
            'show_title' => 'true',
            'style' => 'default'
        ), $atts);
        
        ob_start();
        ?>
        <div class="barbershop-booking-shortcode" data-style="<?php echo esc_attr($atts['style']); ?>">
            <?php if ($atts['show_title'] === 'true'): ?>
                <h3 class="booking-title"><?php echo esc_html($atts['title']); ?></h3>
            <?php endif; ?>
            <div id="barbershop-booking-form" class="booking-widget-container">
                <!-- Booking form will be loaded here by JavaScript -->
                <div class="booking-loading">
                    <?php _e('Laden...', 'barbershop-booking-widget'); ?>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function add_admin_menu() {
        add_options_page(
            __('Barbershop Booking Settings', 'barbershop-booking-widget'),
            __('Barbershop Booking', 'barbershop-booking-widget'),
            'manage_options',
            'barbershop-booking-settings',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        require_once BARBERSHOP_BOOKING_PLUGIN_PATH . 'includes/admin-page.php';
    }
    
    public function settings_init() {
        register_setting('barbershop_booking_settings', 'barbershop_booking_options');
        
        add_settings_section(
            'barbershop_booking_main',
            __('Supabase Configuratie', 'barbershop-booking-widget'),
            array($this, 'settings_section_callback'),
            'barbershop_booking_settings'
        );
        
        add_settings_field(
            'supabase_url',
            __('Supabase URL', 'barbershop-booking-widget'),
            array($this, 'supabase_url_callback'),
            'barbershop_booking_settings',
            'barbershop_booking_main'
        );
        
        add_settings_field(
            'supabase_anon_key',
            __('Supabase Anon Key', 'barbershop-booking-widget'),
            array($this, 'supabase_anon_key_callback'),
            'barbershop_booking_settings',
            'barbershop_booking_main'
        );
        
        add_settings_field(
            'booking_redirect',
            __('Redirect na boeking', 'barbershop-booking-widget'),
            array($this, 'booking_redirect_callback'),
            'barbershop_booking_settings',
            'barbershop_booking_main'
        );
    }
    
    public function settings_section_callback() {
        echo '<p>' . __('Configureer je Supabase database instellingen hier.', 'barbershop-booking-widget') . '</p>';
    }
    
    public function supabase_url_callback() {
        $options = get_option('barbershop_booking_options');
        echo '<input type="url" name="barbershop_booking_options[supabase_url]" value="' . esc_attr($options['supabase_url'] ?? '') . '" class="regular-text" />';
    }
    
    public function supabase_anon_key_callback() {
        $options = get_option('barbershop_booking_options');
        echo '<input type="text" name="barbershop_booking_options[supabase_anon_key]" value="' . esc_attr($options['supabase_anon_key'] ?? '') . '" class="regular-text" />';
    }
    
    public function booking_redirect_callback() {
        $options = get_option('barbershop_booking_options');
        echo '<input type="url" name="barbershop_booking_options[booking_redirect]" value="' . esc_attr($options['booking_redirect'] ?? '') . '" class="regular-text" placeholder="https://example.com/bedankt" />';
        echo '<p class="description">' . __('Optioneel: URL waar gebruikers na een succesvolle boeking naartoe worden gestuurd.', 'barbershop-booking-widget') . '</p>';
    }
    
    public function ajax_booking_data() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'barbershop_booking_nonce')) {
            wp_die('Security check failed');
        }
        
        $action = sanitize_text_field($_POST['booking_action']);
        $settings = $this->get_settings();
        
        switch ($action) {
            case 'get_services':
                $this->get_services_data($settings);
                break;
            case 'get_barbers':
                $this->get_barbers_data($settings);
                break;
            case 'get_available_slots':
                $this->get_available_slots_data($settings);
                break;
            case 'create_booking':
                $this->create_booking_data($settings);
                break;
            default:
                wp_send_json_error('Invalid action');
        }
    }
    
    private function get_services_data($settings) {
        // This would make API calls to your Supabase database
        // For now, returning mock data
        $services = array(
            array('id' => 1, 'name' => 'Knippen', 'duration' => 30, 'price' => 25),
            array('id' => 2, 'name' => 'Wassen & Knippen', 'duration' => 45, 'price' => 35),
            array('id' => 3, 'name' => 'Baard Trimmen', 'duration' => 15, 'price' => 15)
        );
        
        wp_send_json_success($services);
    }
    
    private function get_barbers_data($settings) {
        // Mock barber data
        $barbers = array(
            array('id' => 1, 'name' => 'Alex'),
            array('id' => 2, 'name' => 'Iman')
        );
        
        wp_send_json_success($barbers);
    }
    
    private function get_available_slots_data($settings) {
        // This would calculate available time slots based on date, barber, and service
        $date = sanitize_text_field($_POST['date']);
        $barber_id = intval($_POST['barber_id']);
        $service_id = intval($_POST['service_id']);
        
        // Mock available slots
        $slots = array(
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        );
        
        wp_send_json_success($slots);
    }
    
    private function create_booking_data($settings) {
        // This would create the actual booking in Supabase
        $booking_data = array(
            'customer_name' => sanitize_text_field($_POST['customer_name']),
            'customer_email' => sanitize_email($_POST['customer_email']),
            'customer_phone' => sanitize_text_field($_POST['customer_phone']),
            'service_id' => intval($_POST['service_id']),
            'barber_id' => intval($_POST['barber_id']),
            'date' => sanitize_text_field($_POST['date']),
            'time' => sanitize_text_field($_POST['time']),
            'notes' => sanitize_textarea_field($_POST['notes'])
        );
        
        // Here you would make the actual API call to Supabase
        // For now, simulating success
        wp_send_json_success(array('booking_id' => 123, 'message' => 'Boeking succesvol!'));
    }
    
    private function should_enqueue_scripts() {
        global $post;
        
        // Check if widget is active
        if (is_active_widget(false, false, 'barbershop_booking_widget')) {
            return true;
        }
        
        // Check if shortcode is used in current post
        if ($post && has_shortcode($post->post_content, 'barbershop_booking')) {
            return true;
        }
        
        return false;
    }
    
    private function get_settings() {
        $options = get_option('barbershop_booking_options', array());
        return array(
            'supabase_url' => $options['supabase_url'] ?? '',
            'supabase_anon_key' => $options['supabase_anon_key'] ?? '',
            'booking_redirect' => $options['booking_redirect'] ?? ''
        );
    }
}

// Initialize the plugin
new BarbershopBookingWidget();

// Activation hook
register_activation_hook(__FILE__, 'barbershop_booking_activate');
function barbershop_booking_activate() {
    // Set default options
    $default_options = array(
        'supabase_url' => '',
        'supabase_anon_key' => '',
        'booking_redirect' => ''
    );
    
    add_option('barbershop_booking_options', $default_options);
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'barbershop_booking_deactivate');
function barbershop_booking_deactivate() {
    // Clean up if needed
}
