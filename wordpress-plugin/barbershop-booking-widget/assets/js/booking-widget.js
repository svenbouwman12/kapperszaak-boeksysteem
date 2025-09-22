/**
 * Barbershop Booking Widget JavaScript
 * Integrates the booking system into WordPress
 */

(function($) {
    'use strict';
    
    class BarbershopBookingWidget {
        constructor(container, options = {}) {
            this.container = $(container);
            this.options = {
                style: 'default',
                showServices: true,
                showBarbers: true,
                showNotes: false,
                ...options
            };
            
            this.currentStep = 1;
            this.bookingData = {
                service: null,
                barber: null,
                date: null,
                time: null,
                customer: {
                    name: '',
                    email: '',
                    phone: '',
                    notes: ''
                }
            };
            
            this.services = [];
            this.barbers = [];
            this.availableSlots = [];
            
            this.init();
        }
        
        init() {
            this.loadServices();
            this.setupEventListeners();
        }
        
        setupEventListeners() {
            // Service selection
            this.container.on('change', '.service-select', (e) => {
                this.bookingData.service = parseInt($(e.target).val());
                this.loadBarbers();
                this.updateStep(2);
            });
            
            // Barber selection
            this.container.on('change', '.barber-select', (e) => {
                this.bookingData.barber = parseInt($(e.target).val());
                this.updateStep(3);
            });
            
            // Date selection
            this.container.on('change', '.date-input', (e) => {
                this.bookingData.date = $(e.target).val();
                this.loadAvailableSlots();
                this.updateStep(4);
            });
            
            // Time selection
            this.container.on('click', '.time-slot', (e) => {
                const timeSlot = $(e.target);
                $('.time-slot').removeClass('selected');
                timeSlot.addClass('selected');
                this.bookingData.time = timeSlot.data('time');
                this.updateStep(5);
            });
            
            // Form submission
            this.container.on('submit', '.booking-form', (e) => {
                e.preventDefault();
                this.submitBooking();
            });
            
            // Back button
            this.container.on('click', '.back-btn', () => {
                this.goBack();
            });
            
            // Reset button
            this.container.on('click', '.reset-btn', () => {
                this.reset();
            });
        }
        
        async loadServices() {
            try {
                const response = await this.ajaxCall('get_services');
                this.services = response.data;
                this.renderServices();
            } catch (error) {
                this.showError('Kon diensten niet laden');
            }
        }
        
        async loadBarbers() {
            try {
                const response = await this.ajaxCall('get_barbers');
                this.barbers = response.data;
                this.renderBarbers();
            } catch (error) {
                this.showError('Kon kappers niet laden');
            }
        }
        
        async loadAvailableSlots() {
            if (!this.bookingData.service || !this.bookingData.barber || !this.bookingData.date) {
                return;
            }
            
            try {
                const response = await this.ajaxCall('get_available_slots', {
                    date: this.bookingData.date,
                    barber_id: this.bookingData.barber,
                    service_id: this.bookingData.service
                });
                this.availableSlots = response.data;
                this.renderTimeSlots();
            } catch (error) {
                this.showError('Kon beschikbare tijden niet laden');
            }
        }
        
        renderServices() {
            if (!this.options.showServices) {
                this.bookingData.service = this.services[0]?.id || null;
                this.updateStep(2);
                return;
            }
            
            const html = `
                <div class="booking-step step-1">
                    <h3>${barbershopBooking.strings.selectService}</h3>
                    <div class="service-grid">
                        ${this.services.map(service => `
                            <div class="service-card" data-service-id="${service.id}">
                                <div class="service-name">${service.name}</div>
                                <div class="service-duration">${service.duration} min</div>
                                <div class="service-price">€${service.price}</div>
                            </div>
                        `).join('')}
                    </div>
                    <select class="service-select" style="display: none;">
                        <option value="">${barbershopBooking.strings.selectService}</option>
                        ${this.services.map(service => `
                            <option value="${service.id}">${service.name} - €${service.price}</option>
                        `).join('')}
                    </select>
                </div>
            `;
            
            this.container.find('.booking-loading').replaceWith(html);
            
            // Add click handlers for service cards
            this.container.find('.service-card').on('click', (e) => {
                const card = $(e.currentTarget);
                this.container.find('.service-card').removeClass('selected');
                card.addClass('selected');
                this.bookingData.service = parseInt(card.data('service-id'));
                this.loadBarbers();
                this.updateStep(2);
            });
        }
        
        renderBarbers() {
            if (!this.options.showBarbers) {
                this.bookingData.barber = this.barbers[0]?.id || null;
                this.updateStep(3);
                return;
            }
            
            const html = `
                <div class="booking-step step-2">
                    <h3>${barbershopBooking.strings.selectBarber}</h3>
                    <div class="barber-grid">
                        ${this.barbers.map(barber => `
                            <div class="barber-card" data-barber-id="${barber.id}">
                                <div class="barber-avatar">${barber.name.charAt(0)}</div>
                                <div class="barber-name">${barber.name}</div>
                            </div>
                        `).join('')}
                    </div>
                    <select class="barber-select" style="display: none;">
                        <option value="">${barbershopBooking.strings.selectBarber}</option>
                        ${this.barbers.map(barber => `
                            <option value="${barber.id}">${barber.name}</option>
                        `).join('')}
                    </select>
                </div>
            `;
            
            this.container.append(html);
            
            // Add click handlers for barber cards
            this.container.find('.barber-card').on('click', (e) => {
                const card = $(e.currentTarget);
                this.container.find('.barber-card').removeClass('selected');
                card.addClass('selected');
                this.bookingData.barber = parseInt(card.data('barber-id'));
                this.updateStep(3);
            });
        }
        
        renderTimeSlots() {
            const html = `
                <div class="booking-step step-3">
                    <h3>${barbershopBooking.strings.selectDate}</h3>
                    <input type="date" class="date-input" min="${this.getTomorrow()}" required>
                    
                    <div class="time-slots-container" style="display: none;">
                        <h4>${barbershopBooking.strings.selectTime}</h4>
                        <div class="time-slots-grid">
                            ${this.availableSlots.map(slot => `
                                <div class="time-slot" data-time="${slot}">${slot}</div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            this.container.append(html);
        }
        
        renderCustomerForm() {
            const html = `
                <div class="booking-step step-4">
                    <h3>Contactgegevens</h3>
                    <form class="booking-form">
                        <div class="form-group">
                            <label for="customer_name">Naam *</label>
                            <input type="text" id="customer_name" name="customer_name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="customer_email">E-mail *</label>
                            <input type="email" id="customer_email" name="customer_email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="customer_phone">Telefoon *</label>
                            <input type="tel" id="customer_phone" name="customer_phone" required>
                        </div>
                        
                        ${this.options.showNotes ? `
                            <div class="form-group">
                                <label for="customer_notes">Opmerkingen</label>
                                <textarea id="customer_notes" name="customer_notes" rows="3"></textarea>
                            </div>
                        ` : ''}
                        
                        <div class="form-actions">
                            <button type="button" class="btn back-btn">Terug</button>
                            <button type="submit" class="btn btn-primary">Bevestig Boeking</button>
                        </div>
                    </form>
                </div>
            `;
            
            this.container.append(html);
        }
        
        updateStep(step) {
            this.currentStep = step;
            
            // Hide all steps
            this.container.find('.booking-step').hide();
            
            // Show current step
            this.container.find(`.step-${step}`).show();
            
            // Show time slots when date is selected
            if (step === 3 && this.bookingData.date) {
                this.container.find('.time-slots-container').show();
            }
            
            // Show customer form when time is selected
            if (step === 4 && this.bookingData.time && !this.container.find('.step-4').length) {
                this.renderCustomerForm();
            }
        }
        
        async submitBooking() {
            const formData = new FormData(this.container.find('.booking-form')[0]);
            
            // Add booking data
            Object.keys(this.bookingData).forEach(key => {
                if (key !== 'customer') {
                    formData.append(key, this.bookingData[key]);
                } else {
                    Object.keys(this.bookingData.customer).forEach(customerKey => {
                        formData.append(`customer_${customerKey}`, this.bookingData.customer[customerKey]);
                    });
                }
            });
            
            try {
                this.showLoading();
                const response = await this.ajaxCall('create_booking', formData);
                
                if (response.success) {
                    this.showSuccess();
                    
                    // Redirect if configured
                    if (barbershopBooking.settings.booking_redirect) {
                        setTimeout(() => {
                            window.location.href = barbershopBooking.settings.booking_redirect;
                        }, 2000);
                    }
                } else {
                    this.showError(response.data.message || 'Boeking mislukt');
                }
            } catch (error) {
                this.showError('Er is een fout opgetreden bij het boeken');
            }
        }
        
        goBack() {
            if (this.currentStep > 1) {
                this.currentStep--;
                this.updateStep(this.currentStep);
            }
        }
        
        reset() {
            this.currentStep = 1;
            this.bookingData = {
                service: null,
                barber: null,
                date: null,
                time: null,
                customer: {
                    name: '',
                    email: '',
                    phone: '',
                    notes: ''
                }
            };
            
            this.container.find('.booking-step').remove();
            this.container.find('.booking-success-message, .booking-error-message').hide();
            this.container.html('<div class="booking-loading"><div class="loading-spinner"></div><p>Laden...</p></div>');
            
            this.init();
        }
        
        showLoading() {
            this.container.find('.booking-step').hide();
            this.container.append('<div class="booking-loading"><div class="loading-spinner"></div><p>Boeking wordt verwerkt...</p></div>');
        }
        
        showSuccess() {
            this.container.find('.booking-step, .booking-loading').hide();
            this.container.find('.booking-success-message').show();
        }
        
        showError(message) {
            this.container.find('.booking-step, .booking-loading').hide();
            this.container.find('.booking-error-message .error-text').text(message);
            this.container.find('.booking-error-message').show();
        }
        
        ajaxCall(action, data = {}) {
            return new Promise((resolve, reject) => {
                const ajaxData = {
                    action: 'barbershop_booking_data',
                    booking_action: action,
                    nonce: barbershopBooking.nonce,
                    ...data
                };
                
                $.ajax({
                    url: barbershopBooking.ajaxUrl,
                    type: 'POST',
                    data: ajaxData,
                    success: resolve,
                    error: reject
                });
            });
        }
        
        getTomorrow() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        }
    }
    
    // Initialize widgets when document is ready
    $(document).ready(function() {
        // Initialize all booking widgets
        $('.barbershop-booking-widget-content, .barbershop-booking-shortcode').each(function() {
            const container = $(this).find('.booking-widget-container');
            if (container.length && !container.data('initialized')) {
                const style = $(this).data('style') || 'default';
                new BarbershopBookingWidget(container, { style });
                container.data('initialized', true);
            }
        });
    });
    
})(jQuery);
