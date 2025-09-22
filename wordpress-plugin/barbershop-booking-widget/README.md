# Barbershop Booking Widget

Een WordPress plugin die je bestaande barbershop boekingsysteem integreert als widget en shortcode in je WordPress website.

## 🚀 Functies

- **Widget Support**: Plaats het boekingsysteem in elke widget area
- **Shortcode Support**: Gebruik `[barbershop_booking]` overal op je site
- **Responsive Design**: Werkt perfect op desktop, tablet en mobiel
- **Supabase Integratie**: Verbindt met je bestaande Supabase database
- **Flexibele Styling**: 3 verschillende stijlen (Standaard, Compact, Modern)
- **Admin Interface**: Eenvoudige configuratie via WordPress admin
- **Multi-taal Ready**: Ondersteuning voor vertalingen

## 📋 Vereisten

- WordPress 5.0 of hoger
- PHP 7.4 of hoger
- Supabase account en database
- Bestaand barbershop boekingsysteem met Supabase backend

## 🛠 Installatie

### Stap 1: Plugin Uploaden

1. Download de plugin bestanden
2. Upload de `barbershop-booking-widget` folder naar `/wp-content/plugins/`
3. Activeer de plugin in WordPress Admin → Plugins

### Stap 2: Supabase Configuratie

1. Ga naar **Settings → Barbershop Booking** in je WordPress admin
2. Voer je Supabase gegevens in:
   - **Supabase URL**: `https://your-project.supabase.co`
   - **Supabase Anon Key**: Je publieke API key
   - **Redirect URL**: (Optioneel) Waar klanten na boeking naartoe gaan

### Stap 3: Database Setup

Zorg ervoor dat je Supabase database deze tabellen bevat:

```sql
-- Services tabel
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Barbers tabel
CREATE TABLE barbers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments tabel
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
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Gebruik

### Als Widget

1. Ga naar **Appearance → Widgets**
2. Sleep "Barbershop Booking Widget" naar je gewenste widget area
3. Configureer de widget instellingen:
   - Titel
   - Stijl (Standaard/Compact/Modern)
   - Maximale breedte
   - Formulier opties

### Als Shortcode

Gebruik deze shortcode in pagina's, berichten of widgets:

```
[barbershop_booking]
```

**Met opties:**
```
[barbershop_booking title="Boek een Afspraak" style="modern" show_title="true"]
```

**Beschikbare opties:**
- `title`: Widget titel
- `style`: `default`, `compact`, of `modern`
- `show_title`: `true` of `false`

### In PHP Templates

```php
<?php echo do_shortcode('[barbershop_booking style="modern"]'); ?>
```

## 🎨 Stijlen

### Standaard
- Klassieke styling met witte achtergrond
- Geschikt voor de meeste themes

### Compact
- Kleinere knoppen en spacing
- Ideaal voor sidebar widgets

### Modern
- Gradient achtergrond
- Moderne card-based design

## ⚙️ Widget Instellingen

### Basis Instellingen
- **Titel**: Widget titel (optioneel)
- **Titel tonen**: Of de titel getoond wordt
- **Stijl**: Visuele stijl van de widget
- **Maximale breedte**: CSS waarde (bijv. 300px, 100%)

### Formulier Opties
- **Diensten selectie**: Of klanten een dienst kunnen kiezen
- **Kapper selectie**: Of klanten een kapper kunnen kiezen
- **Opmerkingen veld**: Of er een opmerkingen veld is

## 🔧 Aanpassingen

### Custom CSS

Voeg custom styling toe aan je theme's `style.css`:

```css
/* Pas de widget styling aan */
.barbershop-booking-widget-content {
    border-radius: 15px;
}

.barbershop-booking-widget-content .btn-primary {
    background: #your-color;
}
```

### JavaScript Hooks

```javascript
// Voeg custom validatie toe
jQuery(document).ready(function($) {
    $('.booking-form').on('submit', function(e) {
        // Custom validatie logica
        if (!validateCustomField()) {
            e.preventDefault();
            alert('Custom validatie fout');
        }
    });
});
```

## 🐛 Probleemoplossing

### Widget toont niet
1. Controleer of de widget actief is in Appearance → Widgets
2. Controleer je Supabase instellingen
3. Kijk in browser console voor JavaScript errors

### Boekingen worden niet opgeslagen
1. Test de Supabase verbinding in Settings → Barbershop Booking
2. Controleer of database tabellen bestaan
3. Controleer Supabase Row Level Security (RLS) policies

### Styling problemen
1. Controleer of theme CSS conflicteert
2. Probeer verschillende widget stijlen
3. Voeg custom CSS toe voor aanpassingen

## 🔒 Beveiliging

### Supabase RLS Policies

Zorg voor juiste Row Level Security policies:

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

- Plugin gebruikt WordPress nonces voor beveiliging
- Alle input wordt gesanitized
- AJAX calls zijn beveiligd met nonces

## 📱 Responsive Design

De widget is volledig responsive en werkt op:
- Desktop computers
- Tablets (iPad, Android tablets)
- Smartphones (iPhone, Android)

## 🌍 Multi-taal Ondersteuning

De plugin is klaar voor vertalingen:

1. Kopieer `.po` bestanden naar `/languages/`
2. Gebruik tools zoals Poedit voor vertalingen
3. Activeer de gewenste taal in WordPress

## 🔄 Updates

### Automatische Updates
De plugin ondersteunt WordPress automatische updates.

### Handmatige Updates
1. Download nieuwe versie
2. Vervang plugin bestanden
3. Test functionaliteit

## 📞 Ondersteuning

### Debug Informatie
Activeer WordPress debug mode voor meer informatie:

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

## 📄 Licentie

Deze plugin is vrijgegeven onder de GPL v2 of later licentie.

## 🚀 Roadmap

Geplande features:
- [ ] Email notificaties
- [ ] Google Calendar integratie
- [ ] Multi-locatie ondersteuning
- [ ] Advanced reporting
- [ ] Mobile app API

## 🤝 Bijdragen

Wees welkom om bij te dragen aan deze plugin:

1. Fork de repository
2. Maak een feature branch
3. Commit je wijzigingen
4. Push naar de branch
5. Maak een Pull Request

## 📧 Contact

Voor vragen of ondersteuning:
- WordPress.org support forum
- GitHub issues
- Email: support@yourdomain.com

---

**Versie**: 1.0.0  
**Laatste update**: 2024  
**WordPress vereisten**: 5.0+  
**PHP vereisten**: 7.4+
