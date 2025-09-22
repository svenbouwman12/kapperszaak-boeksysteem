#!/usr/bin/env node

/**
 * Script to rename all barber/barbers references to kapper/kappers
 * Run this with: node rename_barber_to_kapper.js
 */

const fs = require('fs');
const path = require('path');

// Files to process
const files = [
  'admin.js',
  'wijzig-afspraak.js',
  'script.js'
];

// Replacement mappings
const replacements = [
  // Table names
  { from: /from\("barbers"\)/g, to: 'from("kappers")' },
  { from: /from\('barbers'\)/g, to: "from('kappers')" },
  { from: /from\("barber_availability"\)/g, to: 'from("kapper_availability")' },
  { from: /from\('barber_availability'\)/g, to: "from('kapper_availability')" },
  
  // Column names
  { from: /barber_id/g, to: 'kapper_id' },
  { from: /barberId/g, to: 'kapperId' },
  
  // Function names
  { from: /loadBarbers\(\)/g, to: 'loadKappers()' },
  { from: /loadBarberCards\(\)/g, to: 'loadKapperCards()' },
  { from: /loadBarberAvailability/g, to: 'loadKapperAvailability' },
  { from: /saveBarberAvailability/g, to: 'saveKapperAvailability' },
  { from: /generateBarberAvailableSlots/g, to: 'generateKapperAvailableSlots' },
  { from: /getBarberData/g, to: 'getKapperData' },
  { from: /initBarberSubTabs/g, to: 'initKapperSubTabs' },
  
  // Variable names
  { from: /allBarbers/g, to: 'allKappers' },
  { from: /barbers/g, to: 'kappers' },
  { from: /barber/g, to: 'kapper' },
  
  // DOM elements
  { from: /barbersBody/g, to: 'kappersBody' },
  { from: /barberAvailabilityCards/g, to: 'kapperAvailabilityCards' },
  { from: /barberAvailabilityContent/g, to: 'kapperAvailabilityContent' },
  { from: /barberAvailability/g, to: 'kapperAvailability' },
  { from: /barberCard/g, to: 'kapperCard' },
  { from: /barberRevenueGrid/g, to: 'kapperRevenueGrid' },
  { from: /barberRevenue/g, to: 'kapperRevenue' },
  { from: /editBarber/g, to: 'editKapper' },
  { from: /newBarberName/g, to: 'newKapperName' },
  { from: /addBarberBtn/g, to: 'addKapperBtn' },
  { from: /saveBarberBtn/g, to: 'saveKapperBtn' },
  { from: /deleteBarberBtn/g, to: 'deleteKapperBtn' },
  { from: /barberNameInput/g, to: 'kapperNameInput' },
  { from: /barberFilter/g, to: 'kapperFilter' },
  { from: /appointmentBarber/g, to: 'appointmentKapper' },
  { from: /editAppointmentBarber/g, to: 'editAppointmentKapper' },
  
  // CSS classes
  { from: /barber-cards/g, to: 'kapper-cards' },
  { from: /barber-card/g, to: 'kapper-card' },
  { from: /barber-info/g, to: 'kapper-info' },
  { from: /barber-selector/g, to: 'kapper-selector' },
  { from: /barber-revenue/g, to: 'kapper-revenue' },
  
  // Text content
  { from: /"Barbers"/g, to: '"Kappers"' },
  { from: /'Barbers'/g, to: "'Kappers'" },
  { from: /"Barber"/g, to: '"Kapper"' },
  { from: /'Barber'/g, to: "'Kapper'" },
  { from: /"barber"/g, to: '"kapper"' },
  { from: /'barber'/g, to: "'kapper'" },
  { from: /"barbers"/g, to: '"kappers"' },
  { from: /'barbers'/g, to: "'kappers'" },
  { from: /barber onbekend/g, to: 'kapper onbekend' },
  { from: /Selecteer barber/g, to: 'Selecteer kapper' },
  { from: /Kies een barber/g, to: 'Kies een kapper' },
  { from: /Alle barbers/g, to: 'Alle kappers' },
  { from: /Nieuwe barber/g, to: 'Nieuwe kapper' },
  { from: /Barber Naam/g, to: 'Kapper Naam' },
  { from: /Barber Toevoegen/g, to: 'Kapper Toevoegen' },
  { from: /Barbers Beheer/g, to: 'Kappers Beheer' },
  { from: /Barbers Beheren/g, to: 'Kappers Beheren' },
  { from: /Selecteer Barber/g, to: 'Selecteer Kapper' },
  { from: /Omzet per Barber/g, to: 'Omzet per Kapper' },
  
  // Comments
  { from: /\/\/ Barbers/g, to: '// Kappers' },
  { from: /\/\/ Barber/g, to: '// Kapper' },
  { from: /\/\/ barber/g, to: '// kapper' },
  { from: /\/\/ barbers/g, to: '// kappers' },
];

// Process each file
files.forEach(filename => {
  const filepath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`File ${filename} not found, skipping...`);
    return;
  }
  
  console.log(`Processing ${filename}...`);
  
  let content = fs.readFileSync(filepath, 'utf8');
  let changes = 0;
  
  // Apply all replacements
  replacements.forEach(replacement => {
    const matches = content.match(replacement.from);
    if (matches) {
      content = content.replace(replacement.from, replacement.to);
      changes += matches.length;
    }
  });
  
  // Write back to file
  fs.writeFileSync(filepath, content, 'utf8');
  
  console.log(`  ✓ ${changes} replacements made`);
});

console.log('\n✅ All files processed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run the SQL script: rename_barber_to_kapper.sql');
console.log('2. Test the application');
console.log('3. Commit the changes');
