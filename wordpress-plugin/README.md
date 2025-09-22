# 🚀 Barbershop Booking Widget - WordPress Plugin

Een krachtige WordPress plugin die je bestaande barbershop boekingsysteem integreert als widget en shortcode in je WordPress website.

[![WordPress](https://img.shields.io/badge/WordPress-5.0%2B-blue.svg)](https://wordpress.org/)
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-purple.svg)](https://php.net/)
[![License](https://img.shields.io/badge/License-GPL%20v2%2B-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

## ✨ Functies

- 🎯 **Widget & Shortcode Support** - Plaats het boekingsysteem overal op je site
- 📱 **Responsive Design** - Werkt perfect op desktop, tablet en mobiel
- 🔗 **Supabase Integratie** - Verbindt met je bestaande Supabase database
- 🎨 **Flexibele Styling** - 3 verschillende stijlen (Standaard, Compact, Modern)
- ⚙️ **Admin Interface** - Eenvoudige configuratie via WordPress admin
- 🌍 **Multi-taal Ready** - Ondersteuning voor vertalingen
- 🔒 **Beveiligd** - WordPress nonces en input sanitization
- 🚀 **Performance** - Geoptimaliseerd voor snelheid

## 📦 Download & Installatie

### Optie 1: Direct Download
1. Download de `barbershop-booking-widget.zip` van de [releases pagina](https://github.com/yourusername/barbershop-booking-widget/releases)
2. Upload naar WordPress Admin → Plugins → Add New → Upload Plugin
3. Activeer de plugin

### Optie 2: Git Clone
```bash
git clone https://github.com/yourusername/barbershop-booking-widget.git
```

### Optie 3: Composer (WordPress Development)
```bash
composer require yourusername/barbershop-booking-widget
```

## 🛠 Snelle Start

### Stap 1: Plugin Activeren
1. Upload en activeer de plugin in WordPress
2. Ga naar **Settings → Barbershop Booking**

### Stap 2: Supabase Configureren
```
Supabase URL: https://your-project.supabase.co
Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Stap 3: Database Setup
Zorg dat je Supabase database deze tabellen bevat:

```sql
-- Services
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Barbers
CREATE TABLE barbers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT
);

-- Appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    service_id INTEGER REFERENCES services(id),
    barber_id INTEGER REFERENCES barbers(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    notes TEXT
);
```

### Stap 4: Widget Plaatsen
- **Als Widget**: Appearance → Widgets → Sleep naar widget area
- **Als Shortcode**: `[barbershop_booking]` in pagina/bericht

## 🎯 Gebruik

### Widget Instellingen
- **Titel**: Widget titel (optioneel)
- **Stijl**: Standaard/Compact/Modern
- **Maximale breedte**: CSS waarde
- **Formulier opties**: Configureer wat klanten kunnen selecteren

### Shortcode Opties
```php
// Basis shortcode
[barbershop_booking]

// Met opties
[barbershop_booking title="Boek Nu" style="modern" show_title="true"]
```

**Beschikbare opties:**
- `title`: Widget titel
- `style`: `default`, `compact`, of `modern`
- `show_title`: `true` of `false`

### PHP Template Gebruik
```php
<?php echo do_shortcode('[barbershop_booking style="compact"]'); ?>
```

## 🎨 Stijlen

### 🎯 Standaard
- Klassieke witte achtergrond
- Geschikt voor de meeste themes
- Subtiele schaduwen en borders

### 📱 Compact
- Kleinere knoppen en spacing
- Ideaal voor sidebar widgets
- Geoptimaliseerd voor kleine ruimtes

### ✨ Modern
- Gradient achtergrond
- Moderne card-based design
- Visueel aantrekkelijke interface

## 🔧 Aanpassingen

### Custom CSS
Voeg toe aan je theme's `style.css`:

```css
/* Pas widget styling aan */
.barbershop-booking-widget-content {
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.barbershop-booking-widget-content .btn-primary {
    background: #your-brand-color;
    border-color: #your-brand-color;
}
```

### Custom JavaScript
```javascript
// Custom validatie
jQuery(document).ready(function($) {
    $('.booking-form').on('submit', function(e) {
        // Custom validatie logica
    });
});
```

## 🐛 Probleemoplossing

### Widget toont niet
1. Controleer of widget actief is in Appearance → Widgets
2. Controleer Supabase instellingen
3. Kijk in browser console (F12) voor JavaScript errors

### Boekingen worden niet opgeslagen
1. Test Supabase verbinding in Settings → Barbershop Booking
2. Controleer of database tabellen bestaan
3. Controleer Supabase Row Level Security (RLS) policies

### Styling problemen
1. Controleer theme CSS conflicten
2. Probeer verschillende widget stijlen
3. Voeg custom CSS toe voor aanpassingen

## 🔒 Beveiliging

### Supabase RLS Policies
```sql
-- Services: publiek lezen
CREATE POLICY "Services are viewable by everyone" ON services
    FOR SELECT USING (true);

-- Barbers: publiek lezen  
CREATE POLICY "Barbers are viewable by everyone" ON barbers
    FOR SELECT USING (true);

-- Appointments: alleen nieuwe toevoegen
CREATE POLICY "Anyone can insert appointments" ON appointments
    FOR INSERT WITH CHECK (true);
```

### WordPress Security
- WordPress nonces voor beveiliging
- Input sanitization
- AJAX calls beveiligd met nonces

## 📱 Browser Ondersteuning

- ✅ Chrome 70+
- ✅ Firefox 65+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🌍 Multi-taal Ondersteuning

De plugin is klaar voor vertalingen:

1. Kopieer `.po` bestanden naar `/languages/`
2. Gebruik Poedit voor vertalingen
3. Activeer gewenste taal in WordPress

## 📊 Performance Tips

1. **Cache**: Gebruik caching plugin
2. **Minify**: Compress CSS/JS bestanden
3. **CDN**: Gebruik CDN voor Supabase requests
4. **Lazy loading**: Laad widget alleen wanneer zichtbaar

## 🔄 Updates

### Automatische Updates
WordPress ondersteunt automatische updates voor de plugin.

### Handmatige Updates
1. Download nieuwe versie
2. Vervang oude bestanden
3. Test functionaliteit

## 🤝 Bijdragen

Wees welkom om bij te dragen:

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Maak een Pull Request

### Development Setup
```bash
git clone https://github.com/yourusername/barbershop-booking-widget.git
cd barbershop-booking-widget
# Start WordPress development environment
```

## 📋 Roadmap

- [ ] Email notificaties
- [ ] Google Calendar integratie
- [ ] Multi-locatie ondersteuning
- [ ] Advanced reporting dashboard
- [ ] Mobile app API
- [ ] Payment integratie
- [ ] Loyalty program integratie

## 📞 Ondersteuning

### Debug Informatie
Activeer WordPress debug mode:
```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### Log Bestanden
Check deze bestanden voor errors:
- `/wp-content/debug.log`
- Browser console (F12)
- WordPress error logs

### Contact
- 📧 **Email**: support@yourdomain.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/barbershop-booking-widget/issues)
- 💬 **Forum**: [WordPress.org Support](https://wordpress.org/support/plugin/barbershop-booking-widget/)

## 📄 Licentie

Deze plugin is vrijgegeven onder de [GPL v2 of later](https://www.gnu.org/licenses/gpl-2.0.html) licentie.

## 🙏 Credits

- **WordPress** - Het beste CMS platform
- **Supabase** - Krachtige backend-as-a-service
- **Contributors** - Alle bijdragers aan dit project

## 📈 Changelog

### 1.0.0 (2024-01-XX)
- 🎉 Eerste release
- ✨ Widget en shortcode functionaliteit
- 🎨 3 verschillende stijlen
- 🔗 Supabase integratie
- 📱 Responsive design
- ⚙️ Admin interface
- 🌍 Multi-taal ready

---

**Versie**: 1.0.0  
**Laatste update**: 2024  
**WordPress vereisten**: 5.0+  
**PHP vereisten**: 7.4+  

⭐ **Als deze plugin nuttig is, geef het een ster op GitHub!**
