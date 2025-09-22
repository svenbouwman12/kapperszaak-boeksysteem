# Barbershop Booking Widget - Installatie Gids

## 🚀 Snelle Start

### Stap 1: Plugin Installeren

1. **Download de plugin bestanden**
   ```
   barbershop-booking-widget/
   ├── barbershop-booking-widget.php
   ├── includes/
   │   ├── class-booking-widget.php
   │   └── admin-page.php
   ├── assets/
   │   ├── css/
   │   │   ├── booking-widget.css
   │   │   └── admin.css
   │   └── js/
   │       └── booking-widget.js
   └── README.md
   ```

2. **Upload naar WordPress**
   - Upload de hele `barbershop-booking-widget` folder naar `/wp-content/plugins/`
   - Of gebruik WordPress Admin → Plugins → Add New → Upload Plugin

3. **Activeer de Plugin**
   - Ga naar WordPress Admin → Plugins
   - Zoek "Barbershop Booking Widget"
   - Klik "Activate"

### Stap 2: Supabase Configureren

1. **Ga naar Plugin Settings**
   - WordPress Admin → Settings → Barbershop Booking

2. **Voer Supabase Gegevens In**
   ```
   Supabase URL: https://your-project.supabase.co
   Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Redirect URL: https://yoursite.com/bedankt (optioneel)
   ```

3. **Test de Verbinding**
   - Klik "Test Verbinding" om te controleren of alles werkt

### Stap 3: Database Setup

Zorg dat je Supabase database deze tabellen heeft:

```sql
-- 1. Services tabel
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Barbers tabel  
CREATE TABLE barbers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Appointments tabel
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    service_id INTEGER REFERENCES services(id),
    barber_id INTEGER REFERENCES barbers(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Barber availability tabel (optioneel)
CREATE TABLE barber_availability (
    id SERIAL PRIMARY KEY,
    barber_id INTEGER REFERENCES barbers(id),
    day_of_week INTEGER NOT NULL, -- 0=zondag, 1=maandag, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT true
);
```

### Stap 4: Row Level Security (RLS)

Stel RLS policies in voor beveiliging:

```sql
-- Services: publiek lezen
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone" ON services
    FOR SELECT USING (active = true);

-- Barbers: publiek lezen
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbers are viewable by everyone" ON barbers
    FOR SELECT USING (active = true);

-- Appointments: alleen nieuwe toevoegen
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert appointments" ON appointments
    FOR INSERT WITH CHECK (true);

-- Barber availability: publiek lezen
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is viewable by everyone" ON barber_availability
    FOR SELECT USING (active = true);
```

### Stap 5: Test Data Toevoegen

Voeg wat test data toe:

```sql
-- Services
INSERT INTO services (name, duration, price) VALUES
('Knippen', 30, 25.00),
('Wassen & Knippen', 45, 35.00),
('Baard Trimmen', 15, 15.00),
('Knippen + Baard', 45, 35.00);

-- Barbers
INSERT INTO barbers (name, email, phone) VALUES
('Alex', 'alex@barbershop.com', '+31 6 12345678'),
('Iman', 'iman@barbershop.com', '+31 6 87654321');

-- Barber availability (werkdagen 09:00-17:00)
INSERT INTO barber_availability (barber_id, day_of_week, start_time, end_time) VALUES
(1, 1, '09:00', '17:00'), -- Maandag
(1, 2, '09:00', '17:00'), -- Dinsdag
(1, 3, '09:00', '17:00'), -- Woensdag
(1, 4, '09:00', '17:00'), -- Donderdag
(1, 5, '09:00', '17:00'), -- Vrijdag
(2, 1, '09:00', '17:00'), -- Maandag
(2, 2, '09:00', '17:00'), -- Dinsdag
(2, 3, '09:00', '17:00'), -- Woensdag
(2, 4, '09:00', '17:00'), -- Donderdag
(2, 5, '09:00', '17:00'); -- Vrijdag
```

## 🎯 Widget Gebruik

### Optie 1: Als Widget

1. Ga naar **Appearance → Widgets**
2. Sleep "Barbershop Booking Widget" naar je sidebar/widget area
3. Configureer de instellingen:
   - **Titel**: "Boek een Afspraak"
   - **Stijl**: Standaard/Compact/Modern
   - **Maximale breedte**: 300px
   - **Formulier opties**: Kies wat klanten kunnen selecteren

### Optie 2: Als Shortcode

Voeg deze shortcode toe aan elke pagina/bericht:

```
[barbershop_booking]
```

**Met opties:**
```
[barbershop_booking title="Boek Nu" style="modern" show_title="true"]
```

### Optie 3: In PHP Template

```php
<?php 
// In je theme template
echo do_shortcode('[barbershop_booking style="compact"]'); 
?>
```

## 🔧 Aanpassingen

### Custom Styling

Voeg toe aan je theme's `style.css`:

```css
/* Pas de widget styling aan */
.barbershop-booking-widget-content {
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

/* Pas button kleuren aan */
.barbershop-booking-widget-content .btn-primary {
    background: #your-brand-color;
    border-color: #your-brand-color;
}

.barbershop-booking-widget-content .btn-primary:hover {
    background: #your-brand-color-dark;
    border-color: #your-brand-color-dark;
}
```

### Custom JavaScript

```javascript
// In je theme's functions.php of custom JS file
jQuery(document).ready(function($) {
    // Custom validatie
    $('.booking-form').on('submit', function(e) {
        var phone = $('#customer_phone').val();
        
        // Nederlandse telefoon validatie
        if (!phone.match(/^(\+31|0)[0-9]{9}$/)) {
            e.preventDefault();
            alert('Voer een geldig Nederlands telefoonnummer in');
        }
    });
    
    // Custom styling op basis van geselecteerde service
    $('.service-card').on('click', function() {
        var serviceName = $(this).find('.service-name').text();
        console.log('Geselecteerde service:', serviceName);
    });
});
```

## 🐛 Troubleshooting

### Probleem: Widget toont "Laden..." maar laadt niet

**Oplossing:**
1. Controleer browser console (F12) voor JavaScript errors
2. Controleer Supabase instellingen in WordPress Admin
3. Test de Supabase verbinding

### Probleem: Boekingen worden niet opgeslagen

**Oplossing:**
1. Controleer of database tabellen bestaan
2. Controleer RLS policies
3. Controleer Supabase logs

### Probleem: Styling ziet er niet goed uit

**Oplossing:**
1. Controleer of theme CSS conflicteert
2. Probeer verschillende widget stijlen
3. Voeg custom CSS toe

### Probleem: Widget werkt niet op mobiel

**Oplossing:**
1. Controleer of theme responsive is
2. Controleer viewport meta tag
3. Test in verschillende browsers

## 📱 Browser Ondersteuning

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Beveiliging Checklist

- [ ] RLS policies ingesteld
- [ ] Supabase anon key is publiek (dit is OK)
- [ ] WordPress nonces gebruikt
- [ ] Input sanitization actief
- [ ] HTTPS gebruikt op productie site

## 📊 Performance Tips

1. **Cache de widget**: Gebruik een caching plugin
2. **Minify assets**: Compress CSS/JS bestanden
3. **CDN**: Gebruik een CDN voor Supabase requests
4. **Lazy loading**: Laad widget alleen wanneer zichtbaar

## 🔄 Updates

### Automatische Updates
WordPress kan de plugin automatisch updaten.

### Handmatige Updates
1. Download nieuwe versie
2. Vervang oude bestanden
3. Test functionaliteit
4. Backup maken voor grote updates

## 📞 Support

### Debug Informatie Verzamelen

1. **Activeer WordPress Debug:**
   ```php
   // wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```

2. **Check Log Bestanden:**
   - `/wp-content/debug.log`
   - Browser console (F12)
   - Supabase dashboard logs

3. **Test in Staging:**
   - Maak een staging site
   - Test alle functionaliteit
   - Voer updates uit in staging eerst

### Contact Informatie

Voor ondersteuning:
- WordPress.org support forum
- GitHub issues
- Email: support@yourdomain.com

---

**Versie**: 1.0.0  
**Laatste update**: 2024  
**Compatibiliteit**: WordPress 5.0+, PHP 7.4+
