<?php
/**
 * Barbershop Booking Widget Class
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Barbershop_Booking_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'barbershop_booking_widget',
            __('Barbershop Booking Widget', 'barbershop-booking-widget'),
            array(
                'description' => __('Toont het barbershop boekingsysteem als widget', 'barbershop-booking-widget'),
                'classname' => 'barbershop-booking-widget'
            )
        );
    }
    
    /**
     * Outputs the content of the widget
     */
    public function widget($args, $instance) {
        $title = apply_filters('widget_title', $instance['title']);
        $show_title = isset($instance['show_title']) ? $instance['show_title'] : true;
        $widget_style = isset($instance['widget_style']) ? $instance['widget_style'] : 'default';
        $max_width = isset($instance['max_width']) ? $instance['max_width'] : '300px';
        
        echo $args['before_widget'];
        
        // Widget title
        if ($show_title && !empty($title)) {
            echo $args['before_title'] . $title . $args['after_title'];
        }
        
        // Widget content
        ?>
        <div class="barbershop-booking-widget-content" 
             data-style="<?php echo esc_attr($widget_style); ?>"
             style="max-width: <?php echo esc_attr($max_width); ?>;">
            
            <div id="barbershop-booking-widget-<?php echo $this->id; ?>" class="booking-widget-container">
                <!-- Booking form will be loaded here by JavaScript -->
                <div class="booking-loading">
                    <div class="loading-spinner"></div>
                    <p><?php _e('Laden...', 'barbershop-booking-widget'); ?></p>
                </div>
            </div>
            
            <!-- Success message template -->
            <div class="booking-success-message" style="display: none;">
                <div class="success-icon">✓</div>
                <h4><?php _e('Boeking Succesvol!', 'barbershop-booking-widget'); ?></h4>
                <p><?php _e('Je afspraak is bevestigd. Je ontvangt een bevestigingsmail.', 'barbershop-booking-widget'); ?></p>
            </div>
            
            <!-- Error message template -->
            <div class="booking-error-message" style="display: none;">
                <div class="error-icon">✗</div>
                <h4><?php _e('Fout bij Boeking', 'barbershop-booking-widget'); ?></h4>
                <p class="error-text"></p>
            </div>
            
        </div>
        
        <style>
        .barbershop-booking-widget-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .booking-loading {
            text-align: center;
            padding: 20px;
        }
        
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007cba;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .booking-success-message,
        .booking-error-message {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            margin-top: 15px;
        }
        
        .booking-success-message {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        
        .booking-error-message {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        
        .success-icon,
        .error-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .success-icon {
            color: #28a745;
        }
        
        .error-icon {
            color: #dc3545;
        }
        </style>
        
        <?php
        echo $args['after_widget'];
    }
    
    /**
     * Outputs the options form on admin
     */
    public function form($instance) {
        $title = isset($instance['title']) ? $instance['title'] : __('Boek een Afspraak', 'barbershop-booking-widget');
        $show_title = isset($instance['show_title']) ? $instance['show_title'] : true;
        $widget_style = isset($instance['widget_style']) ? $instance['widget_style'] : 'default';
        $max_width = isset($instance['max_width']) ? $instance['max_width'] : '300px';
        $show_services = isset($instance['show_services']) ? $instance['show_services'] : true;
        $show_barbers = isset($instance['show_barbers']) ? $instance['show_barbers'] : true;
        $show_notes = isset($instance['show_notes']) ? $instance['show_notes'] : false;
        ?>
        
        <div class="barbershop-booking-widget-admin">
            <p>
                <label for="<?php echo $this->get_field_id('title'); ?>">
                    <?php _e('Titel:', 'barbershop-booking-widget'); ?>
                </label>
                <input class="widefat" 
                       id="<?php echo $this->get_field_id('title'); ?>" 
                       name="<?php echo $this->get_field_name('title'); ?>" 
                       type="text" 
                       value="<?php echo esc_attr($title); ?>" />
            </p>
            
            <p>
                <input class="checkbox" 
                       type="checkbox" 
                       <?php checked($show_title); ?> 
                       id="<?php echo $this->get_field_id('show_title'); ?>" 
                       name="<?php echo $this->get_field_name('show_title'); ?>" />
                <label for="<?php echo $this->get_field_id('show_title'); ?>">
                    <?php _e('Titel tonen', 'barbershop-booking-widget'); ?>
                </label>
            </p>
            
            <p>
                <label for="<?php echo $this->get_field_id('widget_style'); ?>">
                    <?php _e('Stijl:', 'barbershop-booking-widget'); ?>
                </label>
                <select class="widefat" 
                        id="<?php echo $this->get_field_id('widget_style'); ?>" 
                        name="<?php echo $this->get_field_name('widget_style'); ?>">
                    <option value="default" <?php selected($widget_style, 'default'); ?>>
                        <?php _e('Standaard', 'barbershop-booking-widget'); ?>
                    </option>
                    <option value="compact" <?php selected($widget_style, 'compact'); ?>>
                        <?php _e('Compact', 'barbershop-booking-widget'); ?>
                    </option>
                    <option value="modern" <?php selected($widget_style, 'modern'); ?>>
                        <?php _e('Modern', 'barbershop-booking-widget'); ?>
                    </option>
                </select>
            </p>
            
            <p>
                <label for="<?php echo $this->get_field_id('max_width'); ?>">
                    <?php _e('Maximale breedte:', 'barbershop-booking-widget'); ?>
                </label>
                <input class="widefat" 
                       id="<?php echo $this->get_field_id('max_width'); ?>" 
                       name="<?php echo $this->get_field_name('max_width'); ?>" 
                       type="text" 
                       value="<?php echo esc_attr($max_width); ?>" 
                       placeholder="300px" />
                <small><?php _e('Bijv: 300px, 100%, auto', 'barbershop-booking-widget'); ?></small>
            </p>
            
            <hr>
            
            <h4><?php _e('Formulier Opties', 'barbershop-booking-widget'); ?></h4>
            
            <p>
                <input class="checkbox" 
                       type="checkbox" 
                       <?php checked($show_services); ?> 
                       id="<?php echo $this->get_field_id('show_services'); ?>" 
                       name="<?php echo $this->get_field_name('show_services'); ?>" />
                <label for="<?php echo $this->get_field_id('show_services'); ?>">
                    <?php _e('Diensten selectie tonen', 'barbershop-booking-widget'); ?>
                </label>
            </p>
            
            <p>
                <input class="checkbox" 
                       type="checkbox" 
                       <?php checked($show_barbers); ?> 
                       id="<?php echo $this->get_field_id('show_barbers'); ?>" 
                       name="<?php echo $this->get_field_name('show_barbers'); ?>" />
                <label for="<?php echo $this->get_field_id('show_barbers'); ?>">
                    <?php _e('Kapper selectie tonen', 'barbershop-booking-widget'); ?>
                </label>
            </p>
            
            <p>
                <input class="checkbox" 
                       type="checkbox" 
                       <?php checked($show_notes); ?> 
                       id="<?php echo $this->get_field_id('show_notes'); ?>" 
                       name="<?php echo $this->get_field_name('show_notes'); ?>" />
                <label for="<?php echo $this->get_field_id('show_notes'); ?>">
                    <?php _e('Opmerkingen veld tonen', 'barbershop-booking-widget'); ?>
                </label>
            </p>
            
            <hr>
            
            <div class="widget-preview">
                <h5><?php _e('Voorbeeld:', 'barbershop-booking-widget'); ?></h5>
                <div class="preview-content" style="border: 1px dashed #ccc; padding: 10px; background: #f9f9f9;">
                    <?php if ($show_title && !empty($title)): ?>
                        <strong><?php echo esc_html($title); ?></strong><br><br>
                    <?php endif; ?>
                    <small><?php _e('• Datum selectie', 'barbershop-booking-widget'); ?></small><br>
                    <?php if ($show_services): ?>
                        <small><?php _e('• Dienst selectie', 'barbershop-booking-widget'); ?></small><br>
                    <?php endif; ?>
                    <?php if ($show_barbers): ?>
                        <small><?php _e('• Kapper selectie', 'barbershop-booking-widget'); ?></small><br>
                    <?php endif; ?>
                    <small><?php _e('• Tijd selectie', 'barbershop-booking-widget'); ?></small><br>
                    <small><?php _e('• Contactgegevens', 'barbershop-booking-widget'); ?></small><br>
                    <?php if ($show_notes): ?>
                        <small><?php _e('• Opmerkingen', 'barbershop-booking-widget'); ?></small><br>
                    <?php endif; ?>
                    <small><?php _e('• Bevestigingsknop', 'barbershop-booking-widget'); ?></small>
                </div>
            </div>
        </div>
        
        <style>
        .barbershop-booking-widget-admin {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .barbershop-booking-widget-admin hr {
            margin: 15px 0;
            border: none;
            border-top: 1px solid #ddd;
        }
        
        .barbershop-booking-widget-admin h4,
        .barbershop-booking-widget-admin h5 {
            margin: 10px 0 5px;
            color: #333;
        }
        
        .barbershop-booking-widget-admin small {
            color: #666;
            font-size: 11px;
        }
        
        .widget-preview {
            margin-top: 15px;
        }
        
        .preview-content {
            font-size: 12px;
            line-height: 1.4;
        }
        </style>
        
        <?php
    }
    
    /**
     * Processing widget options on save
     */
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? strip_tags($new_instance['title']) : '';
        $instance['show_title'] = isset($new_instance['show_title']) ? (bool) $new_instance['show_title'] : false;
        $instance['widget_style'] = (!empty($new_instance['widget_style'])) ? strip_tags($new_instance['widget_style']) : 'default';
        $instance['max_width'] = (!empty($new_instance['max_width'])) ? strip_tags($new_instance['max_width']) : '300px';
        $instance['show_services'] = isset($new_instance['show_services']) ? (bool) $new_instance['show_services'] : false;
        $instance['show_barbers'] = isset($new_instance['show_barbers']) ? (bool) $new_instance['show_barbers'] : false;
        $instance['show_notes'] = isset($new_instance['show_notes']) ? (bool) $new_instance['show_notes'] : false;
        
        return $instance;
    }
}
