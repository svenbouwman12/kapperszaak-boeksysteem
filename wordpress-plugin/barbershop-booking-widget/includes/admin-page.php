<?php
/**
 * Admin Settings Page
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Handle form submission
if (isset($_POST['submit'])) {
    if (wp_verify_nonce($_POST['barbershop_booking_nonce'], 'barbershop_booking_settings')) {
        $options = array(
            'supabase_url' => sanitize_url($_POST['barbershop_booking_options']['supabase_url']),
            'supabase_anon_key' => sanitize_text_field($_POST['barbershop_booking_options']['supabase_anon_key']),
            'booking_redirect' => sanitize_url($_POST['barbershop_booking_options']['booking_redirect'])
        );
        
        update_option('barbershop_booking_options', $options);
        echo '<div class="notice notice-success"><p>' . __('Instellingen opgeslagen!', 'barbershop-booking-widget') . '</p></div>';
    }
}

// Test connection
if (isset($_POST['test_connection'])) {
    if (wp_verify_nonce($_POST['barbershop_booking_nonce'], 'barbershop_booking_settings')) {
        $options = get_option('barbershop_booking_options');
        $test_result = $this->test_supabase_connection($options);
        
        if ($test_result['success']) {
            echo '<div class="notice notice-success"><p>' . __('Verbinding succesvol! Database is bereikbaar.', 'barbershop-booking-widget') . '</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>' . __('Verbinding mislukt: ', 'barbershop-booking-widget') . $test_result['message'] . '</p></div>';
        }
    }
}

$options = get_option('barbershop_booking_options', array());
?>

<div class="wrap">
    <h1><?php _e('Barbershop Booking Widget Instellingen', 'barbershop-booking-widget'); ?></h1>
    
    <div class="barbershop-booking-admin">
        <div class="admin-header">
            <h2><?php _e('Supabase Database Configuratie', 'barbershop-booking-widget'); ?></h2>
            <p><?php _e('Configureer hier je Supabase database instellingen om het boekingsysteem te verbinden met je bestaande database.', 'barbershop-booking-widget'); ?></p>
        </div>
        
        <form method="post" action="">
            <?php wp_nonce_field('barbershop_booking_settings', 'barbershop_booking_nonce'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="supabase_url"><?php _e('Supabase URL', 'barbershop-booking-widget'); ?></label>
                    </th>
                    <td>
                        <input type="url" 
                               id="supabase_url" 
                               name="barbershop_booking_options[supabase_url]" 
                               value="<?php echo esc_attr($options['supabase_url'] ?? ''); ?>" 
                               class="regular-text" 
                               placeholder="https://your-project.supabase.co"
                               required />
                        <p class="description">
                            <?php _e('Je Supabase project URL. Vind je deze in je Supabase dashboard onder Settings > API.', 'barbershop-booking-widget'); ?>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="supabase_anon_key"><?php _e('Supabase Anon Key', 'barbershop-booking-widget'); ?></label>
                    </th>
                    <td>
                        <input type="text" 
                               id="supabase_anon_key" 
                               name="barbershop_booking_options[supabase_anon_key]" 
                               value="<?php echo esc_attr($options['supabase_anon_key'] ?? ''); ?>" 
                               class="regular-text" 
                               placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                               required />
                        <p class="description">
                            <?php _e('Je Supabase anon/public key. Ook te vinden in Settings > API.', 'barbershop-booking-widget'); ?>
                        </p>
                        <button type="button" class="button button-secondary toggle-key-visibility">
                            <?php _e('Toon/Verberg Key', 'barbershop-booking-widget'); ?>
                        </button>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="booking_redirect"><?php _e('Redirect na Boeking', 'barbershop-booking-widget'); ?></label>
                    </th>
                    <td>
                        <input type="url" 
                               id="booking_redirect" 
                               name="barbershop_booking_options[booking_redirect]" 
                               value="<?php echo esc_attr($options['booking_redirect'] ?? ''); ?>" 
                               class="regular-text" 
                               placeholder="https://example.com/bedankt" />
                        <p class="description">
                            <?php _e('Optioneel: URL waar klanten na een succesvolle boeking naartoe worden gestuurd.', 'barbershop-booking-widget'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            
            <div class="admin-actions">
                <input type="submit" name="submit" class="button button-primary" value="<?php _e('Instellingen Opslaan', 'barbershop-booking-widget'); ?>" />
                <input type="submit" name="test_connection" class="button button-secondary" value="<?php _e('Test Verbinding', 'barbershop-booking-widget'); ?>" />
            </div>
        </form>
        
        <div class="admin-info">
            <h3><?php _e('Widget Gebruik', 'barbershop-booking-widget'); ?></h3>
            <div class="usage-cards">
                <div class="usage-card">
                    <h4><?php _e('Als Widget', 'barbershop-booking-widget'); ?></h4>
                    <p><?php _e('Ga naar Appearances > Widgets en sleep de "Barbershop Booking Widget" naar je gewenste widget area.', 'barbershop-booking-widget'); ?></p>
                    <code><?php _e('Automatisch beschikbaar in widget areas', 'barbershop-booking-widget'); ?></code>
                </div>
                
                <div class="usage-card">
                    <h4><?php _e('Als Shortcode', 'barbershop-booking-widget'); ?></h4>
                    <p><?php _e('Gebruik deze shortcode in je pagina\'s, berichten of widgets:', 'barbershop-booking-widget'); ?></p>
                    <code>[barbershop_booking]</code>
                    <p><?php _e('Met opties:', 'barbershop-booking-widget'); ?></p>
                    <code>[barbershop_booking title="Boek Nu" style="modern" show_title="true"]</code>
                </div>
                
                <div class="usage-card">
                    <h4><?php _e('In PHP Code', 'barbershop-booking-widget'); ?></h4>
                    <p><?php _e('Voor developers die het in templates willen gebruiken:', 'barbershop-booking-widget'); ?></p>
                    <code>&lt;?php echo do_shortcode('[barbershop_booking]'); ?&gt;</code>
                </div>
            </div>
        </div>
        
        <div class="admin-troubleshooting">
            <h3><?php _e('Probleemoplossing', 'barbershop-booking-widget'); ?></h3>
            <div class="troubleshooting-list">
                <div class="troubleshooting-item">
                    <h4><?php _e('Widget toont niet', 'barbershop-booking-widget'); ?></h4>
                    <ul>
                        <li><?php _e('Controleer of de widget actief is in Appearances > Widgets', 'barbershop-booking-widget'); ?></li>
                        <li><?php _e('Controleer of je Supabase instellingen correct zijn', 'barbershop-booking-widget'); ?></li>
                        <li><?php _e('Kijk in de browser console voor JavaScript errors', 'barbershop-booking-widget'); ?></li>
                    </ul>
                </div>
                
                <div class="troubleshooting-item">
                    <h4><?php _e('Boekingen worden niet opgeslagen', 'barbershop-booking-widget'); ?></h4>
                    <ul>
                        <li><?php _e('Test de Supabase verbinding met de knop hierboven', 'barbershop-booking-widget'); ?></li>
                        <li><?php _e('Controleer of je database tabellen bestaan (services, barbers, appointments)', 'barbershop-booking-widget'); ?></li>
                        <li><?php _e('Controleer je Supabase Row Level Security (RLS) policies', 'barbershop-booking-widget'); ?></li>
                    </ul>
                </div>
                
                <div class="troubleshooting-item">
                    <h4><?php _e('Styling problemen', 'barbershop-booking-widget'); ?></h4>
                    <ul>
                        <li><?php _e('Controleer of je theme CSS conflicteert met de widget styling', 'barbershop-booking-widget'); ?></li>
                        <li><?php _e('Probeer verschillende widget stijlen (Standaard, Compact, Modern)', 'barbershop-booking-widget'); ?></li>
                        <li><?php _e('Voeg custom CSS toe aan je theme voor aanpassingen', 'barbershop-booking-widget'); ?></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="admin-support">
            <h3><?php _e('Ondersteuning', 'barbershop-booking-widget'); ?></h3>
            <p><?php _e('Voor meer hulp of vragen:', 'barbershop-booking-widget'); ?></p>
            <ul>
                <li><?php _e('Controleer de WordPress debug log voor errors', 'barbershop-booking-widget'); ?></li>
                <li><?php _e('Test de widget in verschillende browsers', 'barbershop-booking-widget'); ?></li>
                <li><?php _e('Controleer of alle benodigde JavaScript en CSS bestanden geladen worden', 'barbershop-booking-widget'); ?></li>
            </ul>
        </div>
    </div>
</div>

<style>
.barbershop-booking-admin {
    max-width: 800px;
}

.admin-header {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    border-left: 4px solid #007cba;
}

.admin-header h2 {
    margin: 0 0 10px 0;
    color: #2c3e50;
}

.admin-actions {
    margin: 30px 0;
    padding: 20px 0;
    border-top: 1px solid #e9ecef;
}

.admin-actions .button {
    margin-right: 10px;
}

.admin-info {
    background: #fff;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 25px;
    margin: 30px 0;
}

.admin-info h3 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    font-size: 1.3em;
}

.usage-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.usage-card {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e9ecef;
}

.usage-card h4 {
    margin: 0 0 10px 0;
    color: #007cba;
    font-size: 1.1em;
}

.usage-card p {
    margin: 10px 0;
    font-size: 0.9em;
    color: #6c757d;
}

.usage-card code {
    background: #e9ecef;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    display: block;
    margin: 10px 0;
    color: #495057;
    border: 1px solid #dee2e6;
}

.admin-troubleshooting {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 25px;
    margin: 30px 0;
}

.admin-troubleshooting h3 {
    margin: 0 0 20px 0;
    color: #856404;
    font-size: 1.3em;
}

.troubleshooting-list {
    display: grid;
    gap: 20px;
}

.troubleshooting-item {
    background: #fff;
    padding: 20px;
    border-radius: 6px;
    border: 1px solid #ffeaa7;
}

.troubleshooting-item h4 {
    margin: 0 0 10px 0;
    color: #856404;
    font-size: 1.1em;
}

.troubleshooting-item ul {
    margin: 10px 0 0 20px;
    color: #6c757d;
}

.troubleshooting-item li {
    margin: 5px 0;
    font-size: 0.9em;
}

.admin-support {
    background: #d1ecf1;
    border: 1px solid #bee5eb;
    border-radius: 8px;
    padding: 25px;
    margin: 30px 0;
}

.admin-support h3 {
    margin: 0 0 15px 0;
    color: #0c5460;
    font-size: 1.3em;
}

.admin-support p {
    margin: 0 0 15px 0;
    color: #0c5460;
}

.admin-support ul {
    margin: 0 0 0 20px;
    color: #0c5460;
}

.admin-support li {
    margin: 5px 0;
    font-size: 0.9em;
}

.toggle-key-visibility {
    margin-left: 10px;
    font-size: 0.9em;
}

@media (max-width: 768px) {
    .usage-cards {
        grid-template-columns: 1fr;
    }
    
    .admin-actions .button {
        display: block;
        width: 100%;
        margin: 5px 0;
    }
}
</style>

<script>
jQuery(document).ready(function($) {
    // Toggle key visibility
    $('.toggle-key-visibility').on('click', function() {
        const input = $('#supabase_anon_key');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            $(this).text('<?php _e('Verberg Key', 'barbershop-booking-widget'); ?>');
        } else {
            input.attr('type', 'password');
            $(this).text('<?php _e('Toon Key', 'barbershop-booking-widget'); ?>');
        }
    });
    
    // Set initial password type for security
    $('#supabase_anon_key').attr('type', 'password');
});
</script>
