// ====================== Gebruik globale Supabase client ======================
const supabase = window.supabase;

// Global variables for current user
let currentUser = null;
let currentUserRole = null;

// Get current user and their role
async function getCurrentUserInfo() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }

    // Get user role from admin_users table
    const { data: adminUser, error: roleError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !adminUser) {
      console.error('Role error:', roleError);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: adminUser.role
    };
  } catch (error) {
    console.error('Error getting current user info:', error);
    return null;
  }
}

// Role-based access control
function hasPermission(action, resource) {
  if (!currentUserRole) return false;
  
  const permissions = {
    admin: ['*'], // Admin can do everything
    manager: ['read', 'write', 'update', 'delete'], // Manager can do most things
    staff: ['read', 'write', 'update'], // Staff can read, write, update but not delete
    viewer: ['read'] // Viewer can only read
  };
  
  const userPermissions = permissions[currentUserRole] || [];
  return userPermissions.includes('*') || userPermissions.includes(action);
}

function canAccessTab(tabId) {
  if (!currentUserRole) return false;
  
  const tabPermissions = {
    'agenda': ['admin', 'manager', 'staff', 'viewer'], // Everyone can see agenda
    'boekingen': ['admin', 'manager', 'staff', 'viewer'], // Everyone can see afspraken
    'diensten': ['admin', 'manager', 'staff'], // Staff and above can manage services
    'kappers': ['admin', 'manager', 'staff'], // Staff and above can manage kappers
    'klanten': ['admin', 'manager', 'staff'], // Staff and above can manage customers
    'statistieken': ['admin', 'manager'], // Only admin and manager can see stats
    'instellingen': ['admin'] // Only admin can change settings
  };
  
  const allowedRoles = tabPermissions[tabId] || [];
  return allowedRoles.includes(currentUserRole);
}

// Apply role-based access control to tabs
function applyRoleBasedAccess() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    const tabId = button.getAttribute('data-tab');
    
    if (!canAccessTab(tabId)) {
      button.style.display = 'none';
    }
  });
  
  // Hide delete buttons for staff and viewer roles
  if (!hasPermission('delete')) {
    const deleteButtons = document.querySelectorAll('[class*="delete"], [id*="delete"], [onclick*="delete"]');
    deleteButtons.forEach(button => {
      button.style.display = 'none';
    });
  }
  
  // Show user info
  if (currentUser) {
    const header = document.querySelector('header h1');
    if (header) {
      const roleDisplay = {
        admin: '🔑 Administrator',
        manager: '👨‍💼 Manager', 
        staff: '👤 Medewerker',
        viewer: '👁️ Bekijker'
      };
      
      const roleText = roleDisplay[currentUserRole] || currentUserRole;
      header.innerHTML += ` <span style="font-size: 0.7em; color: #666;">(${roleText})</span>`;
    }
  }
}

// ====================== Tab Navigation ======================
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      
      // Load data when specific tabs are opened
      if (targetTab === 'agenda') {
        loadWeekAppointments();
      } else if (targetTab === 'boekingen') {
        loadBookingsList();
      } else if (targetTab === 'kappers') {
        loadKappers();
      } else if (targetTab === 'diensten') {
        loadDiensten();
      } else if (targetTab === 'klanten') {
        loadCustomers();
      } else if (targetTab === 'gebruikers') {
        loadUsers();
      } else if (targetTab === 'statistieken') {
        loadStatistics();
      }
      
      // Stop auto-update when leaving bookings tab
      if (targetTab !== 'boekingen') {
        stopBookingsAutoUpdate();
      }
    });
  });
}


// Simple sub-tab switching function
window.switchSubTab = function(targetSubTab) {
  console.log('Switching to sub-tab:', targetSubTab);
  
  // Hide all sub-tab panels
  const allPanels = document.querySelectorAll('#instellingen .sub-tab-panel');
  allPanels.forEach(panel => {
    panel.style.display = 'none';
    panel.classList.remove('active');
  });
  
  // Remove active class from all buttons
  const allButtons = document.querySelectorAll('#instellingen .sub-tab-btn');
  allButtons.forEach(btn => btn.classList.remove('active'));
  
  // Show target panel and activate button
  const targetPanel = document.getElementById(targetSubTab);
  const targetButton = document.querySelector(`[data-sub-tab="${targetSubTab}"]`);
  
  if (targetPanel) {
    targetPanel.style.display = 'block';
    targetPanel.classList.add('active');
    console.log('Activated panel:', targetSubTab);
  }
  
  if (targetButton) {
    targetButton.classList.add('active');
  }
};

// ====================== Settings Tabs ======================
window.switchSettingsTab = function(tabName) {
  console.log('Switching to settings tab:', tabName);
  
  // Hide all settings tab panels
  const allPanels = document.querySelectorAll('#instellingen .settings-tab-panel');
  allPanels.forEach(panel => {
    panel.style.display = 'none';
    panel.classList.remove('active');
  });
  
  // Remove active class from all settings tab buttons
  const allButtons = document.querySelectorAll('#instellingen .settings-tab-btn');
  allButtons.forEach(btn => btn.classList.remove('active'));
  
  // Show target panel and activate button
  const targetPanel = document.getElementById('settings-' + tabName);
  const targetButton = document.querySelector(`#instellingen .settings-tab-btn[onclick*="${tabName}"]`);
  
  if (targetPanel) {
    targetPanel.style.display = 'block';
    targetPanel.classList.add('active');
    console.log('Activated settings panel:', tabName);
  }
  
  if (targetButton) {
    targetButton.classList.add('active');
  }
  
  // Load users when switching to the gebruikers tab
  if (tabName === 'gebruikers') {
    setTimeout(loadUsers, 100); // Small delay to ensure tab is active
  }
};

// ====================== Settings Management ======================
async function resetSettingsToDefault() {
  const confirmed = await customConfirm(
    'Instellingen Resetten',
    'Weet je zeker dat je alle instellingen wilt resetten naar de standaardwaarden? Deze actie kan niet ongedaan worden gemaakt.',
    'Resetten',
    'Annuleren'
  );
  
  if (confirmed) {
    try {
      console.log('Resetting settings to default...');
      
      // Reset loyalty settings
      document.getElementById('loyaltyEnabled').checked = false;
      document.getElementById('pointsPerAppointment').value = 25;
      document.getElementById('pointsForDiscount').value = 100;
      document.getElementById('discountPercentage').value = 50;
      
      // Reset theme settings
      document.getElementById('darkModeEnabled').checked = false;
      document.getElementById('primaryColor').value = '#F28B82';
      document.getElementById('secondaryColor').value = '#F28B82';
      document.getElementById('backgroundColor').value = '#f8f9fa';
      document.getElementById('textColor').value = '#333333';
      
      // Reset display settings
      document.getElementById('siteTitle').value = 'Boekingssysteem';
      document.getElementById('timeSlotInterval').value = 15;
      document.getElementById('maxAdvanceBooking').value = 30;
      
      // Save to database
      await saveSettings();
      
      // Show success message
      await customAlert(
        'Instellingen Gereset',
        'Alle instellingen zijn succesvol gereset naar de standaardwaarden.',
        'OK'
      );
      
      console.log('Settings reset completed');
    } catch (error) {
      console.error('Error resetting settings:', error);
      await customAlert(
        'Fout',
        'Er is een fout opgetreden bij het resetten van de instellingen.',
        'OK'
      );
    }
  }
}

// ====================== Auth check ======================
async function checkAuth() {
  try {
    // Wacht even om ervoor te zorgen dat de sessie volledig geladen is
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // In Supabase v2 kan getUser() een AuthSessionMissingError geven als er geen sessie is.
    // Eerst sessie checken, daarna (optioneel) user ophalen.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Auth session error:", sessionError);
      window.location.href = "admin-login.html";
      return;
    }
    if (!session) {
      console.log("No session found, redirecting to login");
      window.location.href = "admin-login.html";
      return;
    }
    console.log("Session found, user authenticated");
    // Optioneel: user ophalen indien nodig
    // const { data: { user } } = await supabase.auth.getUser();
  } catch (e) {
    console.error("Auth check error:", e);
    window.location.href = "admin-login.html";
  }
}

// ====================== Logout ======================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "admin-login.html";
  });
}

// ====================== Boekingen ======================
async function loadBoekingen() {
  const { data: boekingen, error: boekingenError } = await supabase.from("boekingen").select("*");
  const { data: kappers } = await supabase.from("kappers").select("*");
  const { data: diensten } = await supabase.from("diensten").select("*");
  const tbody = document.getElementById("boekingenBody");
  if (!tbody) return;

  if (boekingenError) {
    console.error("Fout bij laden boekingen:", boekingenError);
    return;
  }

  tbody.innerHTML = "";
  boekingen.forEach(b => {
    const kapper = kappers.find(x => x.id === b.kapper_id);
    const dienst = diensten.find(x => x.id === b.dienst_id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.id}</td>
      <td>${b.klantnaam}</td>
      <td>${kapper ? kapper.naam : "[kapper onbekend]"}</td>
      <td>${dienst ? dienst.naam : "[dienst onbekend]"}</td>
      <td>${new Date(b.datumtijd).toLocaleString()}</td>
      <td><button onclick="deleteBoeking(${b.id})">Verwijder</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteBoeking(id) {
  if (!hasPermission('delete')) {
    alert('Je hebt geen toestemming om afspraken te verwijderen.');
    return;
  }
  
  if (!confirm("Weet je zeker dat je deze boeking wilt verwijderen?")) return;
  const { error } = await supabase.from("boekingen").delete().eq("id", id);
  if (error) console.error("Fout bij verwijderen:", error);
  loadBoekingen();
}

// ====================== Kappers ======================
async function loadKappers() {
  console.log('Loading kappers...');
  const { data, error } = await supabase.from("kappers").select("*").order("id");
  const tbody = document.getElementById("kappersBody");
  
  console.log('Kappers data:', data);
  console.log('Kappers error:', error);
  console.log('Kappers tbody:', tbody);
  
  if (!tbody) {
    console.error('Kappers tbody not found!');
    return;
  }

  if (error) {
    console.error("Fout bij laden kappers:", error);
    return;
  }

  tbody.innerHTML = "";
  data.forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${k.id}</td>
      <td><input type="text" value="${k.naam}" data-id="${k.id}" class="kapperNameInput"></td>
      <td>
        <button class="saveKapperBtn btn btn-sm btn-primary save-btn" data-id="${k.id}">💾 Opslaan</button>
        <button class="deleteKapperBtn btn-danger icon-btn" title="Verwijderen" data-id="${k.id}">🗑️ Verwijder</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Also populate the kapper availability selector with cards
  const kapperCards = document.getElementById('kapperAvailabilityCards');
  if (kapperCards) {
    kapperCards.innerHTML = '';
    data.forEach(kapper => {
      const card = document.createElement('div');
      card.className = 'kapper-card';
      card.dataset.kapperId = kapper.id;
      card.innerHTML = `
        <div class="kapper-info">
          <h4>${kapper.naam}</h4>
        </div>
      `;
      kapperCards.appendChild(card);
    });
  }

  // Edit kapper
  document.querySelectorAll(".kapperNameInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const name = input.value.trim();
      if (!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("kappers").update({ naam: name }).eq("id", id);
      if (error) console.error(error);
      loadKappers();
      // Also refresh kapper availability cards
      loadKapperCards();
    });
  });

  // Save kapper (explicit aanpassen)
  document.querySelectorAll(".saveKapperBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const input = document.querySelector(`input.kapperNameInput[data-id="${id}"]`);
      const name = input ? input.value.trim() : "";
      if (!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("kappers").update({ naam: name }).eq("id", id);
      if (error) console.error(error);
      loadKappers();
      // Also refresh kapper availability cards
      loadKapperCards();
    });
  });

  // Delete kapper - Use event delegation for dynamic content
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("deleteKapperBtn")) {
      const id = e.target.dataset.id;
      const kapperName = e.target.closest('tr').querySelector('.kapperNameInput').value;
      
      console.log('Delete kapper clicked:', id, kapperName);
      
      // Show custom confirmation
      const confirmed = await showKapperDeleteConfirmation(kapperName);
      if (!confirmed) return;
      
      console.log('Deleting kapper:', id);
      
      // First delete related records in kapper_availability
      console.log('Deleting related kapper_availability records...');
      const { error: availabilityError } = await supabase
        .from("kapper_availability")
        .delete()
        .eq("kapper_id", id);
      
      if (availabilityError) {
        console.error("Error deleting kapper availability:", availabilityError);
        alert("Fout bij verwijderen beschikbaarheid: " + availabilityError.message);
        return;
      }
      
      // Then delete related bookings
      console.log('Deleting related bookings...');
      const { error: bookingsError } = await supabase
        .from("boekingen")
        .delete()
        .eq("kapper_id", id);
      
      if (bookingsError) {
        console.error("Error deleting bookings:", bookingsError);
        alert("Fout bij verwijderen afspraken: " + bookingsError.message);
        return;
      }
      
      // Finally delete the kapper
      console.log('Deleting kapper...');
      const { error } = await supabase.from("kappers").delete().eq("id", id);
      if (error) {
        console.error("Error deleting kapper:", error);
        alert("Fout bij verwijderen kapper: " + error.message);
        return;
      }
      
      console.log('Kapper deleted successfully, reloading...');
      
      // Force refresh the kappers table
      await loadKappers();
      
      // Also refresh kapper availability cards
      await loadKapperCards();
      
      // Show success message
      alert('Kapper succesvol verwijderd!');
      
      console.log('Kappers table refreshed');
    }
  });
}

// ====================== Kapper Availability ======================

async function loadKapperCards() {
  try {
    const { data: kappers, error } = await supabase
      .from('kappers')
      .select('id, naam')
      .order('naam');
    
    if (error) {
      console.error('Error loading kappers for availability:', error);
      return;
    }
    
    const cardsContainer = document.getElementById('kapperAvailabilityCards');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = '';
    
    if (kappers && kappers.length > 0) {
      kappers.forEach(kapper => {
        const card = document.createElement('div');
        card.className = 'kapper-card';
        card.dataset.kapperId = kapper.id;
        card.innerHTML = `
          <div class="kapper-card-content">
            <h4>${kapper.naam}</h4>
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    } else {
      cardsContainer.innerHTML = '<p>Geen kappers gevonden. Voeg eerst kappers toe in de "Kappers Beheren" tab.</p>';
    }
  } catch (error) {
    console.error('Error loading kapper cards:', error);
  }
}

// ====================== Kapper Sub-tabs ======================
function initKapperSubTabs() {
  console.log('Initializing kapper sub-tabs...');
  
  // Wait for DOM to be fully loaded
  setTimeout(() => {
    const kapperSubTabButtons = document.querySelectorAll('#kappers .sub-tab-btn[data-subtab]');
    console.log('Found kapper sub-tab buttons:', kapperSubTabButtons.length);
    
    if (kapperSubTabButtons.length === 0) {
      console.log('No kapper sub-tab buttons found, retrying...');
      setTimeout(initKapperSubTabs, 1000);
      return;
    }
    
    kapperSubTabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSubTab = button.getAttribute('data-subtab');
        console.log('Kapper sub-tab clicked:', targetSubTab);
        
        // Hide all sub-tab panels in kappers section
        const kapperPanels = document.querySelectorAll('#kappers .sub-tab-panel');
        kapperPanels.forEach(panel => {
          panel.style.display = 'none';
          panel.classList.remove('active');
        });
        
        // Remove active class from all buttons
        kapperSubTabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show target panel and activate button
        const targetPanel = document.getElementById(targetSubTab + '-kappers');
        if (targetPanel) {
          targetPanel.style.display = 'block';
          targetPanel.classList.add('active');
          console.log('Activated kapper panel:', targetSubTab);
          
          // Load data for specific sub-tab
          if (targetSubTab === 'availability') {
            loadKapperCards();
          }
        }
        button.classList.add('active');
      });
    });
    
    // Initialize first sub-tab as active
    const firstSubTabButton = kapperSubTabButtons[0];
    if (firstSubTabButton) {
      console.log('Clicking first kapper sub-tab button:', firstSubTabButton.getAttribute('data-subtab'));
      firstSubTabButton.click();
    }
  }, 500);
}

function initKlantenSubTabs() {
  // Wait for DOM to be fully loaded
  setTimeout(() => {
    const klantenSubTabButtons = document.querySelectorAll('#klanten .sub-tab-btn[data-subtab]');
    console.log('Found klanten sub-tab buttons:', klantenSubTabButtons.length);
    
    if (klantenSubTabButtons.length === 0) {
      console.log('No klanten sub-tab buttons found, retrying...');
      setTimeout(initKlantenSubTabs, 1000);
      return;
    }
    
    klantenSubTabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSubTab = button.getAttribute('data-subtab');
        console.log('Klanten sub-tab clicked:', targetSubTab);
        
        // Hide all sub-tab panels in klanten section
        const klantenPanels = document.querySelectorAll('#klanten .sub-tab-panel');
        klantenPanels.forEach(panel => {
          panel.style.display = 'none';
          panel.classList.remove('active');
        });
        
        // Remove active class from all buttons
        klantenSubTabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show target panel and activate button
        const targetPanel = document.getElementById(targetSubTab);
        if (targetPanel) {
          targetPanel.style.display = 'block';
          targetPanel.classList.add('active');
          button.classList.add('active');
          
          // Initialize specific functionality based on tab
          if (targetSubTab === 'klanten-importeren') {
            console.log('Initializing customer import functionality...');
            // Customer import functionality is already initialized
          }
        }
      });
    });
    
    // Click first tab by default
    const firstSubTabButton = klantenSubTabButtons[0];
    if (firstSubTabButton) {
      console.log('Clicking first klanten sub-tab button:', firstSubTabButton.getAttribute('data-subtab'));
      firstSubTabButton.click();
    }
  }, 100);
}

function initKapperAvailability() {
  // Initialize kapper sub-tabs first
  initKapperSubTabs();
  
  // Load kapper cards
  loadKapperCards();
  
  // Kapper card click events
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.kapper-card')) {
      const card = e.target.closest('.kapper-card');
      const kapperId = card.dataset.kapperId;
      const content = document.getElementById('kapperAvailabilityContent');
      
      // Remove active class from all cards
      document.querySelectorAll('.kapper-card').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked card
      card.classList.add('active');
      
      if (kapperId) {
        content.style.display = 'block';
        await loadKapperAvailability(kapperId);
      } else {
        content.style.display = 'none';
      }
    }
  });

  // Day checkbox change events
  document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const day = e.target.getAttribute('data-day');
      const dayHours = document.querySelector(`.day-hours[data-day="${day}"]`);
      
      if (e.target.checked) {
        dayHours.style.display = 'block';
      } else {
        dayHours.style.display = 'none';
      }
    });
  });

  // Save button event
  const saveBtn = document.getElementById('saveAvailabilityBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const activeCard = document.querySelector('.kapper-card.active');
      const kapperId = activeCard ? activeCard.dataset.kapperId : null;
      await saveKapperAvailability(kapperId);
    });
  }
}

async function loadKapperAvailability(kapperId) {
  if (!kapperId) return;
  
  try {
    // Load existing availability for this kapper
    const { data, error } = await supabase
      .from('kapper_availability')
      .select('*')
      .eq('kapper_id', kapperId);

    if (error) {
      console.error('Error loading kapper availability:', error);
      return;
    }

    // Reset all checkboxes and time inputs
    document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    document.querySelectorAll('.day-hours').forEach(dayHours => {
      dayHours.style.display = 'none';
    });

    // Populate with existing data
    if (data && data.length > 0) {
      // Integer to day name mapping
      const intToDay = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      };
      
      data.forEach(availability => {
        const dayInt = availability.day_of_week;
        const dayName = intToDay[dayInt]; // Convert integer to day name
        const checkbox = document.querySelector(`input[data-day="${dayName}"]`);
        const dayHours = document.querySelector(`.day-hours[data-day="${dayName}"]`);
        
        if (checkbox) {
          checkbox.checked = true;
          if (dayHours) {
            dayHours.style.display = 'block';
          }
        }
        
        if (dayHours) {
          const startInput = dayHours.querySelector('input[data-type="start"]');
          const endInput = dayHours.querySelector('input[data-type="end"]');
          
          if (startInput) startInput.value = availability.start_time || '09:00';
          if (endInput) endInput.value = availability.end_time || '17:00';
        }
      });
    }
  } catch (error) {
    console.error('Error loading kapper availability:', error);
  }
}

async function saveKapperAvailability(kapperId) {
  if (!kapperId) {
    alert('Selecteer eerst een kapper');
    return;
  }

  try {
    // First, delete existing availability for this kapper
    const { error: deleteError } = await supabase
      .from('kapper_availability')
      .delete()
      .eq('kapper_id', kapperId);

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError);
      return;
    }

    // Get selected days and their times
    const selectedDays = [];
    
    // Day name to integer mapping
    const dayToInt = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
      const dayName = checkbox.getAttribute('data-day');
      const dayHours = document.querySelector(`.day-hours[data-day="${dayName}"]`);
      
      if (dayHours) {
        const startInput = dayHours.querySelector('input[data-type="start"]');
        const endInput = dayHours.querySelector('input[data-type="end"]');
        
        selectedDays.push({
          kapper_id: kapperId,
          day_of_week: dayToInt[dayName], // Convert day name to integer
          start_time: startInput ? startInput.value : '09:00',
          end_time: endInput ? endInput.value : '17:00'
        });
      }
    });

    // Insert new availability
    if (selectedDays.length > 0) {
      const { error: insertError } = await supabase
        .from('kapper_availability')
        .insert(selectedDays);

      if (insertError) {
        console.error('Error saving availability:', insertError);
        alert('Fout bij het opslaan van beschikbaarheid');
        return;
      }
    }

    alert('Beschikbaarheid succesvol opgeslagen!');
  } catch (error) {
    console.error('Error saving kapper availability:', error);
    alert('Fout bij het opslaan van beschikbaarheid');
  }
}

// Helper functions for appointment details
async function getServiceDuration(serviceId) {
  if (!serviceId) return 30;
  try {
    const { data, error } = await supabase.from("diensten").select("duur_minuten").eq("id", serviceId).single();
    if (error) throw error;
    return data?.duur_minuten || 30;
  } catch (e) {
    console.error("Error fetching service duration:", e);
    return 30;
  }
}

async function getServiceName(serviceId) {
  if (!serviceId) return "Onbekend";
  try {
    const { data, error } = await supabase.from("diensten").select("naam").eq("id", serviceId).single();
    if (error) throw error;
    return data?.naam || "Onbekend";
  } catch (e) {
    console.error("Error fetching service name:", e);
    return "Onbekend";
  }
}

async function getKapperName(kapperId) {
  if (!kapperId) return "Onbekend";
  try {
    const { data, error } = await supabase.from("kappers").select("naam").eq("id", kapperId).single();
    if (error) throw error;
    return data?.naam || "Onbekend";
  } catch (e) {
    console.error("Error fetching kapper name:", e);
    return "Onbekend";
  }
}

async function fetchKapperAvailability(kapperId) {
  if (!kapperId) return null;
  try {
    const { data, error } = await supabase
      .from('kapper_availability')
      .select('*')
      .eq('kapper_id', kapperId);
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching kapper availability:', e);
    return [];
  }
}

async function getServicePrice(serviceId) {
  if (!serviceId) return null;
  try {
    const { data, error } = await supabase.from("diensten").select("prijs_euro").eq("id", serviceId).single();
    if (error) throw error;
    return data?.prijs_euro || null;
  } catch (e) {
    console.error("Error fetching service price:", e);
    return null;
  }
}

// ====================== Diensten ======================
async function loadDiensten() {
  const { data, error } = await supabase.from("diensten").select("*").order("id");
  const tbody = document.getElementById("dienstenBody");
  if (!tbody) return;

  if (error) {
    console.error("Fout bij laden diensten:", error);
    return;
  }

  tbody.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td><input type="text" value="${d.naam}" data-id="${d.id}" class="dienstNameInput"></td>
      <td><input type="number" value="${Number(d.prijs_euro ?? 0).toFixed(2)}" step="0.01" min="0" data-id="${d.id}" class="dienstPriceInput"></td>
      <td><input type="number" value="${d.duur_minuten ?? 30}" min="5" max="300" data-id="${d.id}" class="dienstDurationInput"> min</td>
      <td>
        <button class="saveDienstBtn btn btn-sm btn-primary save-btn" data-id="${d.id}">💾 Opslaan</button>
        <button class="deleteDienstBtn btn-danger icon-btn" title="Verwijderen" data-id="${d.id}">🗑️ Verwijder</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Edit dienst naam
  document.querySelectorAll(".dienstNameInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const name = input.value.trim();
      if (!name) return alert("Naam mag niet leeg zijn");
      const { error } = await supabase.from("diensten").update({ naam: name }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Edit dienst prijs
  document.querySelectorAll(".dienstPriceInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const price = parseFloat(input.value);
      if (isNaN(price) || price < 0) return alert("Vul een geldige prijs in");
      const { error } = await supabase.from("diensten").update({ prijs_euro: price }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Edit dienst duur
  document.querySelectorAll(".dienstDurationInput").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const duration = parseInt(input.value);
      if (isNaN(duration) || duration < 5 || duration > 300) return alert("Duur moet tussen 5 en 300 minuten zijn");
      const { error } = await supabase.from("diensten").update({ duur_minuten: duration }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Save dienst (naam + prijs + duur) via knop "Aanpassen"
  document.querySelectorAll(".saveDienstBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const nameInput = document.querySelector(`input.dienstNameInput[data-id="${id}"]`);
      const priceInput = document.querySelector(`input.dienstPriceInput[data-id="${id}"]`);
      const durationInput = document.querySelector(`input.dienstDurationInput[data-id="${id}"]`);
      const name = nameInput ? nameInput.value.trim() : "";
      const price = priceInput ? parseFloat(priceInput.value) : NaN;
      const duration = durationInput ? parseInt(durationInput.value) : 30;
      if (!name) return alert("Naam mag niet leeg zijn");
      if (isNaN(price) || price < 0) return alert("Vul een geldige prijs in");
      if (isNaN(duration) || duration < 5 || duration > 300) return alert("Duur moet tussen 5 en 300 minuten zijn");
      const { error } = await supabase.from("diensten").update({ naam: name, prijs_euro: price, duur_minuten: duration }).eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });

  // Delete dienst
  document.querySelectorAll(".deleteDienstBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const dienstName = btn.closest('tr').querySelector('.dienstNameInput').value;
      
      // Show custom confirmation
      const confirmed = await showDienstDeleteConfirmation(dienstName);
      if (!confirmed) return;
      
      const { error } = await supabase.from("diensten").delete().eq("id", id);
      if (error) console.error(error);
      loadDiensten();
    });
  });
}

const addDienstBtn = document.getElementById("addDienstBtn");
if (addDienstBtn) {
  addDienstBtn.addEventListener("click", async () => {
    const name = document.getElementById("newDienstName").value.trim();
    const priceValue = document.getElementById("newDienstPrice").value;
    const durationValue = document.getElementById("newDienstDuration").value;
    const price = priceValue === "" ? null : parseFloat(priceValue);
    const duration = durationValue === "" ? 30 : parseInt(durationValue);
    if (!name) return alert("Vul een naam in!");
    if (price !== null && (isNaN(price) || price < 0)) return alert("Vul een geldige prijs in!");
    if (isNaN(duration) || duration < 5 || duration > 300) return alert("Duur moet tussen 5 en 300 minuten zijn!");
    const { error } = await supabase.from("diensten").insert([{ naam: name, prijs_euro: price, duur_minuten: duration }]);
    if (error) { console.error(error); return alert("Fout bij toevoegen"); }
    document.getElementById("newDienstName").value = "";
    if (document.getElementById("newDienstPrice")) document.getElementById("newDienstPrice").value = "";
    if (document.getElementById("newDienstDuration")) document.getElementById("newDienstDuration").value = "30";
    loadDiensten();
  });
}

// ====================== Initial load ======================
checkAuth().then(() => {
  loadWeekAppointments();
  loadKappers();
  loadDiensten();
});

// ====================== Beschikbaarheid beheren ======================
// buildAdminTimeSlots function removed - no longer needed

// refreshAdminAvailability function removed - no longer needed

// populateAdminKappers function removed - no longer needed

// adminBlockSelected function removed - no longer needed

// adminUnblockSelected function removed - no longer needed



// ====================== Modern Week Calendar ======================
let currentWeekStart = new Date();
let currentWeekEnd = new Date();

// Initialize modern week calendar
async function initWeekCalendar() {
  console.log('🚀 Initializing modern week calendar...');
  
  // Set to start of current week (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() + daysToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  // Set end of week (Sunday)
  currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  updateWeekDisplay();
  await generateTimeLabels();
  await loadWeekAppointments();
  await updateCurrentTimeLine();
  
  // Update current time line every minute
  // Set up interval to update current time line and appointment status every 30 seconds
  setInterval(async () => {
    await updateCurrentTimeLine();
    // Only refresh appointments if not already loading
    if (!window.appointmentsLoading) {
      loadWeekAppointments(); // Refresh appointments to update status colors
    }
  }, 30000);
  
  console.log('✅ Modern week calendar initialized!');
}

function updateWeekDisplay() {
  // Update week number
  const weekNumber = getWeekNumber(currentWeekStart);
  const weekNumberElement = document.getElementById('weekNumber');
  if (weekNumberElement) {
    weekNumberElement.textContent = `W ${weekNumber}`;
  }
  
  // Update week dates
  const weekDatesElement = document.getElementById('weekDates');
  if (weekDatesElement) {
    const startDate = currentWeekStart.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const endDate = currentWeekEnd.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    weekDatesElement.textContent = `${startDate} - ${endDate}`;
  }
  
  // Update header week display
  const currentWeekDisplayElement = document.getElementById('currentWeekDisplay');
  if (currentWeekDisplayElement) {
    const startDate = currentWeekStart.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const endDate = currentWeekEnd.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    currentWeekDisplayElement.textContent = `Week van ${startDate} - ${endDate}`;
  }
  
  // Update day dates
  const dayDates = ['mondayDate', 'tuesdayDate', 'wednesdayDate', 'thursdayDate', 'fridayDate', 'saturdayDate', 'sundayDate'];
  
  dayDates.forEach((dayId, index) => {
    const dateElement = document.getElementById(dayId);
    if (dateElement) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + index);
      const day = dayDate.getDate();
      const month = dayDate.toLocaleDateString('nl-NL', { month: 'short' });
      dateElement.textContent = `${day} ${month}`;
    }
  });
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}


async function generateTimeLabels() {
  const timeLabelsContainer = document.getElementById('timeLabels');
  if (!timeLabelsContainer) {
    console.error('❌ Time labels container not found!');
    return;
  }
  
  timeLabelsContainer.innerHTML = '';
  
  try {
    // Get all kapper working hours to determine the earliest start and latest end time
    const sb = window.supabase;
    const { data: allAvailability, error } = await sb
      .from('kapper_availability')
      .select('start_time, end_time');
    
    if (error || !allAvailability || allAvailability.length === 0) {
      console.warn('No kapper availability found, using default 9:00-18:00');
      // Fallback to default hours if no availability data
      await generateTimeLabelsForRange('09:00', '18:00', timeLabelsContainer);
      return;
    }
    
    // Find earliest start time and latest end time across all kappers
    let earliestStart = '23:59';
    let latestEnd = '00:00';
    
    allAvailability.forEach(avail => {
      if (avail.start_time && avail.start_time < earliestStart) {
        earliestStart = avail.start_time;
      }
      if (avail.end_time && avail.end_time > latestEnd) {
        latestEnd = avail.end_time;
      }
    });
    
    console.log(`📅 Kapper working hours range: ${earliestStart} to ${latestEnd}`);
    
    // Generate time labels for the working hours range
    await generateTimeLabelsForRange(earliestStart, latestEnd, timeLabelsContainer);
    
  } catch (error) {
    console.error('Error fetching kapper availability:', error);
    // Fallback to default hours
    await generateTimeLabelsForRange('09:00', '18:00', timeLabelsContainer);
  }
}

async function generateTimeLabelsForRange(startTime, endTime, container) {
  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  let [endHour, endMin] = endTime.split(':').map(Number);
  
  // Handle 24:00 as end of day
  if (endTime === '24:00' || endTime === '24:00:00') {
    endHour = 24;
    endMin = 0;
  }
  
  const interval = 15;
  let labelCount = 0;
  let topPosition = 0;
  
  console.log(`🕐 Generating time labels from ${startTime} to ${endTime}`);
  
  for (let hour = startHour; hour <= endHour; hour++) {
    const minuteStart = (hour === startHour) ? startMin : 0;
    const minuteEnd = (hour === endHour) ? endMin : 60;
    
    for (let minute = minuteStart; minute < minuteEnd; minute += interval) {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'time-label';
      timeLabel.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Position each 15-minute slot at 40px intervals
      timeLabel.style.top = `${topPosition}px`;
      timeLabel.style.height = '40px';
      timeLabel.style.minHeight = '40px';
      container.appendChild(timeLabel);
      labelCount++;
      topPosition += 40;
      
      // Debug: Log first few labels
      if (labelCount <= 5) {
        console.log(`Created label ${labelCount}: ${timeLabel.textContent} at ${topPosition - 40}px`);
      }
    }
  }
  
  // Update container height to match the time range
  const totalHeight = labelCount * 40;
  container.style.height = `${totalHeight}px`;
  
  // Also update all calendar containers to match the same height
  const dayAppointments = document.querySelectorAll('.day-appointments');
  const dayColumns = document.querySelectorAll('.day-column');
  const timeColumns = document.querySelectorAll('.time-column');
  
  dayAppointments.forEach(dayContainer => {
    dayContainer.style.height = `${totalHeight}px`;
  });
  
  dayColumns.forEach(dayColumn => {
    dayColumn.style.height = `${totalHeight}px`;
    dayColumn.style.minHeight = `${totalHeight}px`;
  });
  
  timeColumns.forEach(timeColumn => {
    timeColumn.style.height = `${totalHeight}px`;
    timeColumn.style.minHeight = `${totalHeight}px`;
  });
  
  console.log(`✅ Generated ${labelCount} time labels from ${startTime} to ${endTime} (${totalHeight}px height)`);
}

async function updateCurrentTimeLine() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const currentTimeLine = document.getElementById('currentTimeLine');
  if (!currentTimeLine) {
    console.error('❌ Current time line element not found!');
    return;
  }
  
  // Only show if it's today and within current week
  if (now >= currentWeekStart && now <= currentWeekEnd) {
    try {
      // Get the time range used by the calendar
      const sb = window.supabase;
      const { data: allAvailability, error } = await sb
        .from('kapper_availability')
        .select('start_time, end_time');
      
      if (error || !allAvailability || allAvailability.length === 0) {
        console.warn('No kapper availability found for current time line');
        currentTimeLine.style.display = 'none';
        return;
      }
      
      // Find earliest start time across all kappers
      let earliestStart = '23:59';
      allAvailability.forEach(avail => {
        if (avail.start_time && avail.start_time < earliestStart) {
          earliestStart = avail.start_time;
        }
      });
      
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Check if current time is within the working hours range
      if (currentTimeStr < earliestStart) {
        console.log(`🕐 Current time ${currentTimeStr} is before earliest start time ${earliestStart}`);
        currentTimeLine.style.display = 'none';
        return;
      }
      
      // Calculate position relative to the earliest start time
      const [startHour, startMin] = earliestStart.split(':').map(Number);
      const minutesFromStart = (currentHour - startHour) * 60 + (currentMinute - startMin);
      const topPositionPixels = (minutesFromStart / 15) * 40; // 40px per 15-minute slot
      
      console.log(`🕐 Current time: ${currentTimeStr}`);
      console.log(`🕐 Earliest start: ${earliestStart}`);
      console.log(`🕐 Minutes from start: ${minutesFromStart}`);
      console.log(`🕐 Position: ${topPositionPixels}px`);
      
      currentTimeLine.style.top = `${topPositionPixels}px`;
      currentTimeLine.style.display = 'block';
      currentTimeLine.style.left = '100px';
      currentTimeLine.style.right = '0';
      
      console.log(`✅ Current time line positioned at ${topPositionPixels}px`);
    } catch (error) {
      console.error('Error updating current time line:', error);
      currentTimeLine.style.display = 'none';
    }
  } else {
    currentTimeLine.style.display = 'none';
  }
}

async function loadWeekAppointments() {
  // Prevent multiple simultaneous calls
  if (window.appointmentsLoading) {
    console.log('Appointments already loading, skipping...');
    return;
  }
  
  window.appointmentsLoading = true;
  
  try {
    // Clear existing appointments
    document.querySelectorAll('.day-appointments').forEach(container => {
  container.innerHTML = '';
    });
    
    
    console.log('Loading appointments for week:', {
      start: currentWeekStart.toISOString(),
      end: currentWeekEnd.toISOString()
    });
    
    // Load appointments for the current week without joins
    const { data: appointments, error } = await supabase
    .from('boekingen')
      .select('*')
      .gte('datumtijd', currentWeekStart.toISOString())
      .lte('datumtijd', currentWeekEnd.toISOString())
      .order('datumtijd');
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Loaded appointments:', appointments);
    
    // Store all appointments for filtering
    allAppointments = appointments;
    
    // Auto-load Sven's appointments by default
    filterAppointmentsByKapper(1); // Sven's ID is 1
    
    // Group appointments by day
    const appointmentsByDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.datumtijd);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      if (appointmentsByDay[dayName]) {
        appointmentsByDay[dayName].push(appointment);
      }
    });
    
    // Render appointments for each day
    for (const dayName of Object.keys(appointmentsByDay)) {
      const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
      if (container) {
        console.log(`Adding ${appointmentsByDay[dayName].length} appointments to ${dayName} container`);
        for (const appointment of appointmentsByDay[dayName]) {
          const appointmentElement = await createAppointmentElement(appointment);
          container.appendChild(appointmentElement);
          console.log(`Added appointment ${appointment.id} to ${dayName}`);
        }
    } else {
        console.log(`No container found for ${dayName}`);
      }
    }
    
    // Update day dates
    updateDayDates();
    
  } catch (error) {
    console.error('Error loading week appointments:', error);
  } finally {
    // Reset loading flag
    window.appointmentsLoading = false;
  }
}

async function createAppointmentElement(appointment) {
  const appointmentDate = new Date(appointment.datumtijd);
  
  // Get service duration
  const serviceDuration = await getServiceDuration(appointment.dienst_id);
  
  // Calculate height: each 15-minute slot is 40px
  // For 30 minutes: (30 / 15) * 40 = 2 * 40 = 80px
  // For 15 minutes: (15 / 15) * 40 = 1 * 40 = 40px
  // Subtract 2px for border (1px top + 1px bottom) since box-sizing is border-box
  const heightPixels = Math.max((serviceDuration / 15) * 40 - 2, 38); // Minimum 38px height (1 slot minus border)
  console.log(`🔧 Height calculation: ${serviceDuration}min / 15 * 40 - 2 = ${heightPixels}px`);
  
  // Get the earliest start time to calculate relative position
  let earliestStart = '09:00'; // Default fallback
  try {
    const sb = window.supabase;
    const { data: allAvailability, error } = await sb
      .from('kapper_availability')
      .select('start_time');
    
    if (!error && allAvailability && allAvailability.length > 0) {
      earliestStart = '23:59';
      allAvailability.forEach(avail => {
        if (avail.start_time && avail.start_time < earliestStart) {
          earliestStart = avail.start_time;
        }
      });
    }
  } catch (error) {
    console.warn('Error fetching kapper availability for appointment positioning:', error);
  }
  
  // Calculate position relative to the earliest start time
  const [startHour, startMin] = earliestStart.split(':').map(Number);
  const appointmentHour = appointmentDate.getHours();
  const appointmentMinute = appointmentDate.getMinutes();
  
  // Calculate minutes from the earliest start time
  const minutesFromStart = (appointmentHour - startHour) * 60 + (appointmentMinute - startMin);
  
  // Position: each 15-minute slot is 40px
  const topPositionPixels = (minutesFromStart / 15) * 40;
  
  console.log(`Appointment ${appointment.id}:`);
  console.log(`  Time: ${appointmentDate.toLocaleTimeString()}`);
  console.log(`  Earliest start: ${earliestStart}`);
  console.log(`  Minutes from start: ${minutesFromStart}`);
  console.log(`  Duration: ${serviceDuration} minutes`);
  console.log(`  Height: ${heightPixels}px (${serviceDuration / 15} slots)`);
  console.log(`  Top: ${topPositionPixels}px`);
  console.log(`  Bottom: ${topPositionPixels + heightPixels}px`);
  
  const now = new Date();
  const appointmentTime = new Date(appointment.datumtijd);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  let statusClass = 'past';
  if (hoursDiff > 0 && hoursDiff <= 1) {
    statusClass = 'upcoming';
  } else if (hoursDiff <= 0 && hoursDiff >= -1) {
    statusClass = 'current';
  }
  
  // Get service and kapper names
  const serviceName = await getServiceName(appointment.dienst_id);
  const kapperName = await getKapperName(appointment.kapper_id);
  
  const appointmentElement = document.createElement('div');
  appointmentElement.className = `appointment-block ${statusClass}`;
  appointmentElement.style.top = `${topPositionPixels}px`;
  appointmentElement.style.height = `${heightPixels}px`;
  
  // Calculate end time for time range display
  const endTime = new Date(appointmentDate.getTime() + serviceDuration * 60000);
  const timeRange = `${appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  
  console.log(`Appointment ${appointment.id}: ${timeRange} (${serviceDuration} min) - Height: ${heightPixels}px, Top: ${topPositionPixels}px`);
  
  appointmentElement.innerHTML = `
    <div class="appointment-time">${timeRange}</div>
    <div class="appointment-customer">${appointment.klantnaam || 'Onbekend'}</div>
    <div class="appointment-service">${serviceName}</div>
  `;
  
  // Add click handler for appointment details
  appointmentElement.addEventListener('click', () => {
    showAppointmentDetails(appointment);
  });
  
  return appointmentElement;
}

function updateDayDates() {
  const dayColumns = document.querySelectorAll('.day-column');
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  dayColumns.forEach((column, index) => {
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(currentWeekStart.getDate() + index);
    
    const dateElement = column.querySelector('.day-date');
    if (dateElement) {
      dateElement.textContent = dayDate.toLocaleDateString('nl-NL', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  });
}

let currentAppointment = null;

async function showAppointmentDetails(appointment) {
  console.log('Showing appointment details for:', appointment);
  currentAppointment = appointment;
  currentEditingAppointment = appointment;
  
  // Reset edit mode - always show details view first
  document.querySelector('.appointment-details').style.display = 'block';
  document.getElementById('editAppointmentForm').style.display = 'none';
  
  // Load additional data for the appointment
  const appointmentData = await loadAppointmentDetails(appointment.id);
  console.log('Appointment data for popup:', appointmentData);
  
  // Populate popup with data
  console.log('Appointment data for display:', {
    klantnaam: appointmentData.klantnaam || appointment.klantnaam,
    email: appointmentData.email || appointment.email,
    telefoon: appointmentData.telefoon || appointment.telefoon
  });
  
  document.getElementById('appointmentCustomerName').textContent = appointmentData.klantnaam || appointment.klantnaam || 'Onbekend';
  document.getElementById('appointmentCustomerEmail').textContent = appointmentData.email || appointment.email || 'Onbekend';
  document.getElementById('appointmentCustomerPhone').textContent = appointmentData.telefoon || appointment.telefoon || 'Onbekend';
  
  const appointmentDate = new Date(appointmentData.datumtijd || appointment.datumtijd);
  document.getElementById('appointmentDate').textContent = appointmentDate.toLocaleDateString('nl-NL');
  document.getElementById('appointmentTime').textContent = appointmentDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  
  // Get service and kapper names
  const serviceName = await getServiceName(appointmentData.dienst_id || appointment.dienst_id);
  const kapperName = await getKapperName(appointmentData.kapper_id || appointment.kapper_id);
  const servicePrice = await getServicePrice(appointmentData.dienst_id || appointment.dienst_id);
  
  document.getElementById('appointmentKapper').textContent = kapperName;
  document.getElementById('appointmentService').textContent = serviceName;
  document.getElementById('appointmentPrice').textContent = servicePrice ? `€${servicePrice}` : 'Onbekend';
  
  // Show popup
  document.getElementById('appointmentDetailsPopup').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function loadAppointmentDetails(appointmentId) {
  try {
    console.log('Loading appointment details for ID:', appointmentId);
    
    // Load appointment data
    const { data: appointment, error: appointmentError } = await supabase
    .from('boekingen')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    if (appointmentError) {
      console.error('Supabase error loading appointment:', appointmentError);
      throw appointmentError;
    }
    
    console.log('Loaded appointment data:', appointment);
    
    // Load kapper data separately
    let kapperName = 'Onbekend';
    if (appointment.kapper_id) {
      try {
        // Try different table names
        let kapper = null;
        
        // Use the correct table name directly
        const { data: kapperData, error: kapperError } = await supabase
          .from('kappers')
          .select('naam')
          .eq('id', appointment.kapper_id)
          .single();
        
        if (!kapperError && kapperData) {
          kapper = kapperData;
          console.log('Found kapper in kappers table:', kapperData);
    } else {
          console.log('Kapper not found in kappers table:', kapperError);
        }
        
        if (kapper) {
          kapperName = kapper.naam;
        } else {
          console.log('No kapper table found, using fallback');
          kapperName = `Kapper ID: ${appointment.kapper_id}`;
        }
      } catch (kapperError) {
        console.error('Error loading kapper:', kapperError);
        kapperName = `Kapper ID: ${appointment.kapper_id}`;
      }
    }
    
    // Load service data separately
    let serviceName = 'Onbekend';
    let servicePrice = null;
    if (appointment.dienst_id) {
      try {
        // Try different table names
        let service = null;
        
        // Use the correct table name directly
        const { data: serviceData, error: serviceError } = await supabase
          .from('diensten')
          .select('naam, prijs_euro')
          .eq('id', appointment.dienst_id)
          .single();
        
        if (!serviceError && serviceData) {
          service = serviceData;
          console.log('Found service in diensten table:', serviceData);
        } else {
          console.log('Service not found in diensten table:', serviceError);
        }
        
        if (service) {
          serviceName = service.naam;
          servicePrice = service.prijs_euro;
        } else {
          console.log('No service table found, using fallback');
          serviceName = `Dienst ID: ${appointment.dienst_id}`;
        }
      } catch (serviceError) {
        console.error('Error loading service:', serviceError);
        serviceName = `Dienst ID: ${appointment.dienst_id}`;
      }
    }
    
    return {
      ...appointment,
      kapper_naam: kapperName,
      dienst_naam: serviceName,
      dienst_prijs: servicePrice,
      // Ensure correct column names are available
      klantnaam: appointment.klantnaam,
      email: appointment.email,
      telefoon: appointment.telefoon
    };
  } catch (error) {
    console.error('Error loading appointment details:', error);
    // Fallback to current appointment data
    return currentAppointment;
  }
}

function hideAppointmentDetails() {
  document.getElementById('appointmentDetailsPopup').style.display = 'none';
  document.body.style.overflow = 'auto';
  currentAppointment = null;
  currentEditingAppointment = null;
  
  // Reset edit mode when closing popup
  document.querySelector('.appointment-details').style.display = 'block';
  document.getElementById('editAppointmentForm').style.display = 'none';
}

// Kapper filter functions
let allAppointments = [];
let currentKapperFilter = '';

async function loadKapperFilter() {
  const kapperSelect = document.getElementById('kapperFilterSelect');
  if (!kapperSelect) return;
  
  try {
    const { data: kappers, error } = await supabase.from('kappers').select('*').order('naam');
    if (error) throw error;
    
    kapperSelect.innerHTML = '<option value="">Kies een kapper...</option>';
    kappers.forEach(kapper => {
      const option = document.createElement('option');
      option.value = kapper.id;
      option.textContent = kapper.naam;
      kapperSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading kappers for filter:', error);
  }
}

function filterAppointmentsByKapper(kapperId) {
  currentKapperFilter = kapperId;
  
  // Reset day view flag
  window.inDayView = false;
  
  // Clear all appointments first
  document.querySelectorAll('.day-appointments').forEach(container => {
    container.innerHTML = '';
  });
  
  if (!kapperId) {
    // Show all appointments for the current week
    showWeekFirstDayView();
  } else {
    // Show only appointments for selected kapper in the current week
    const filteredAppointments = allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.datumtijd);
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(currentWeekEnd);
      
      return appointment.kapper_id == kapperId && 
             appointmentDate >= weekStart && 
             appointmentDate <= weekEnd;
    });
    
    // Group by day and display
    const appointmentsByDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    filteredAppointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.datumtijd);
      const dayOfWeek = appointmentDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      appointmentsByDay[dayName].push(appointment);
    });
    
    // Display appointments for each day
    Object.keys(appointmentsByDay).forEach(dayName => {
      const dayAppointments = appointmentsByDay[dayName];
      if (dayAppointments.length > 0) {
        const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
        if (container) {
          dayAppointments.forEach(appointment => {
            createAppointmentElement(appointment).then(element => {
              container.appendChild(element);
            });
          });
        }
      }
    });
  }
}

function displayAppointment(appointment) {
  const appointmentDate = new Date(appointment.datumtijd);
  const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const container = document.getElementById(`appointments${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);
  
  if (container) {
    createAppointmentElement(appointment).then(element => {
      container.appendChild(element);
    });
  }
}

function clearAppointments() {
  document.querySelectorAll('.appointments-container').forEach(container => {
    container.innerHTML = '';
  });
}

async function showAllKappersDayView() {
  console.log('🔥 showAllKappersDayView called');
  console.log('🔥 allAppointments:', allAppointments);
  
  // Set day view flag
  window.inDayView = true;
  
  // Clear current appointments
  clearAppointments();
  
  // Get today's date
    const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  console.log('🔥 Today:', todayStr);
  
  // Filter appointments for today only
  const todayAppointments = allAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.datumtijd);
    const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
    return appointmentDateStr === todayStr;
  });
  
  console.log('🔥 Today appointments:', todayAppointments);
  
  // Group by kapper
  const appointmentsByKapper = {};
  todayAppointments.forEach(appointment => {
    if (!appointmentsByKapper[appointment.kapper_id]) {
      appointmentsByKapper[appointment.kapper_id] = [];
    }
    appointmentsByKapper[appointment.kapper_id].push(appointment);
  });
  
  console.log('🔥 Appointments by kapper:', appointmentsByKapper);
  
  // Get kapper names
  const { data: kappers } = await supabase.from('kappers').select('*');
  const kapperNames = {};
  kappers.forEach(kapper => {
    kapperNames[kapper.id] = kapper.naam;
  });
  
  console.log('🔥 Kapper names:', kapperNames);
  
  // Display appointments grouped by kapper
  Object.keys(appointmentsByKapper).forEach(kapperId => {
    const kapperName = kapperNames[kapperId] || `Kapper ${kapperId}`;
    const appointments = appointmentsByKapper[kapperId];
    
    // Create a container for this kapper's appointments
    const kapperContainer = document.createElement('div');
    kapperContainer.className = 'kapper-day-container';
    kapperContainer.innerHTML = `
      <div class="kapper-day-header">
        <h4>${kapperName}</h4>
        <span class="appointment-count">${appointments.length} afspraak${appointments.length !== 1 ? 'ken' : ''}</span>
      </div>
      <div class="kapper-appointments"></div>
    `;
    
    // Add to today's column
    const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayContainer = document.getElementById(`appointments${todayDayName.charAt(0).toUpperCase() + todayDayName.slice(1)}`);
    
    if (todayContainer) {
      todayContainer.appendChild(kapperContainer);
      
      // Add appointments to this kapper's container
      const appointmentsContainer = kapperContainer.querySelector('.kapper-appointments');
      appointments.forEach(appointment => {
        createAppointmentElement(appointment).then(element => {
          appointmentsContainer.appendChild(element);
        });
      });
    }
  });
  
  // Update week display to show today
  document.getElementById('currentWeekDisplay').textContent = `Vandaag - ${today.toLocaleDateString('nl-NL')}`;
}

async function showWeekFirstDayView() {
  console.log('🔥 showWeekFirstDayView called');
  console.log('🔥 currentWeekStart:', currentWeekStart);
  
  // Clear current appointments
  clearAppointments();
  
  // Get the first day of the selected week
  const firstDayOfWeek = new Date(currentWeekStart);
  const firstDayStr = firstDayOfWeek.toISOString().split('T')[0];
  console.log('🔥 First day of week:', firstDayStr);
  
  // Filter appointments for the first day of the week only
  const firstDayAppointments = allAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.datumtijd);
    const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
    return appointmentDateStr === firstDayStr;
  });
  
  console.log('🔥 First day appointments:', firstDayAppointments);
  
  // Group by kapper
  const appointmentsByKapper = {};
  firstDayAppointments.forEach(appointment => {
    if (!appointmentsByKapper[appointment.kapper_id]) {
      appointmentsByKapper[appointment.kapper_id] = [];
    }
    appointmentsByKapper[appointment.kapper_id].push(appointment);
  });
  
  console.log('🔥 Appointments by kapper:', appointmentsByKapper);
  
  // Get kapper names
  const { data: kappers } = await supabase.from('kappers').select('*');
  const kapperNames = {};
  kappers.forEach(kapper => {
    kapperNames[kapper.id] = kapper.naam;
  });
  
  console.log('🔥 Kapper names:', kapperNames);
  
  // Display appointments grouped by kapper
  Object.keys(appointmentsByKapper).forEach(kapperId => {
    const kapperName = kapperNames[kapperId] || `Kapper ${kapperId}`;
    const appointments = appointmentsByKapper[kapperId];
    
    // Create a container for this kapper's appointments
    const kapperContainer = document.createElement('div');
    kapperContainer.className = 'kapper-day-container';
    kapperContainer.innerHTML = `
      <div class="kapper-day-header">
        <h4>${kapperName}</h4>
        <span class="appointment-count">${appointments.length} afspraak${appointments.length !== 1 ? 'ken' : ''}</span>
      </div>
      <div class="kapper-appointments"></div>
    `;
    
    // Add to the first day's column
    const firstDayName = firstDayOfWeek.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const firstDayContainer = document.getElementById(`appointments${firstDayName.charAt(0).toUpperCase() + firstDayName.slice(1)}`);
    
    if (firstDayContainer) {
      firstDayContainer.appendChild(kapperContainer);
      
      // Add appointments to this kapper's container
      const appointmentsContainer = kapperContainer.querySelector('.kapper-appointments');
      appointments.forEach(appointment => {
        createAppointmentElement(appointment).then(element => {
          appointmentsContainer.appendChild(element);
        });
      });
    }
  });
  
  // Update week display to show the first day
  const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  const dayName = dayNames[firstDayOfWeek.getDay()];
  document.getElementById('currentWeekDisplay').textContent = `${dayName} - ${firstDayOfWeek.toLocaleDateString('nl-NL')}`;
}

// Edit form functions
let currentEditingAppointment = null;

function showEditForm() {
  // Hide the details view and show the edit form
  document.querySelector('.appointment-details').style.display = 'none';
  document.getElementById('editAppointmentForm').style.display = 'block';
  
  // Load kappers and services for the dropdowns
  loadEditFormData();
  
  // Setup event listeners for dynamic time slot updates
  setupAppointmentEditEventListeners();
}

function setupAppointmentEditEventListeners() {
  const dateInput = document.getElementById('editAppointmentDate');
  const kapperSelect = document.getElementById('editAppointmentKapper');
  const timeSelect = document.getElementById('editAppointmentTime');
  
  if (dateInput && kapperSelect && timeSelect) {
    const updateTimeSlots = async () => {
      const selectedDate = dateInput.value;
      const selectedKapper = kapperSelect.value;
      
      if (selectedDate && selectedKapper) {
        timeSelect.innerHTML = '<option value="">Laden...</option>';
        timeSelect.disabled = true;
        
        try {
          const timeSlots = await generateKapperAvailableSlots(selectedKapper, selectedDate);
          const currentTime = timeSelect.dataset.currentTime || '';
          
          timeSelect.innerHTML = '';
          if (timeSlots.length > 0) {
            timeSlots.forEach(time => {
              const option = document.createElement('option');
              option.value = time;
              option.textContent = time;
              option.selected = time === currentTime;
              timeSelect.appendChild(option);
            });
          } else {
            timeSelect.innerHTML = '<option value="" disabled>Geen tijden beschikbaar voor deze dag</option>';
          }
        } catch (error) {
          console.error('Error updating time slots:', error);
          timeSelect.innerHTML = '<option value="" disabled>Fout bij laden tijden</option>';
        } finally {
          timeSelect.disabled = false;
        }
      }
    };
    
    // Remove existing listeners to prevent duplicates
    dateInput.removeEventListener('change', updateTimeSlots);
    kapperSelect.removeEventListener('change', updateTimeSlots);
    
    // Add new listeners
    dateInput.addEventListener('change', updateTimeSlots);
    kapperSelect.addEventListener('change', updateTimeSlots);
  }
}

function hideEditForm() {
  // Show the details view and hide the edit form
  document.querySelector('.appointment-details').style.display = 'block';
  document.getElementById('editAppointmentForm').style.display = 'none';
  
  // Clear any form data
  document.getElementById('editCustomerName').value = '';
  document.getElementById('editCustomerEmail').value = '';
  document.getElementById('editCustomerPhone').value = '';
  document.getElementById('editAppointmentDate').value = '';
  document.getElementById('editAppointmentTime').value = '';
  document.getElementById('editAppointmentKapper').value = '';
  document.getElementById('editAppointmentService').value = '';
}

async function loadEditFormData() {
  // Load kappers
  const kapperSelect = document.getElementById('editAppointmentKapper');
  const { data: kappers } = await supabase.from('kappers').select('*').order('id');
  
  kapperSelect.innerHTML = '<option value="">Kies een kapper...</option>';
  kappers.forEach(kapper => {
    const option = document.createElement('option');
    option.value = kapper.id;
    option.textContent = kapper.naam;
    kapperSelect.appendChild(option);
  });
  
  // Load services
  const serviceSelect = document.getElementById('editAppointmentService');
  const { data: services } = await supabase.from('diensten').select('*').order('id');
  
  serviceSelect.innerHTML = '<option value="">Kies een dienst...</option>';
  services.forEach(service => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.naam} (€${service.prijs_euro})`;
    serviceSelect.appendChild(option);
  });
  
  // Populate form with current appointment data
  if (currentEditingAppointment) {
    const appointment = currentEditingAppointment;
    const appointmentDate = new Date(appointment.datumtijd);
    
    document.getElementById('editCustomerName').value = appointment.klantnaam || '';
    document.getElementById('editCustomerEmail').value = appointment.email || '';
    document.getElementById('editCustomerPhone').value = appointment.telefoon || '';
    document.getElementById('editAppointmentDate').value = appointmentDate.toISOString().split('T')[0];
    
    // Populate time select with kapper available slots
    const timeSelect = document.getElementById('editAppointmentTime');
    const currentTime = appointmentDate.toTimeString().slice(0, 5);
    
    // Store current time for event listeners
    timeSelect.dataset.currentTime = currentTime;
    
    const timeSlots = await generateKapperAvailableSlots(appointment.kapper_id, appointmentDate.toISOString().split('T')[0], appointment.id);
    
    timeSelect.innerHTML = '';
    if (timeSlots.length > 0) {
      timeSlots.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        option.selected = time === currentTime;
        timeSelect.appendChild(option);
      });
    } else {
      timeSelect.innerHTML = '<option value="" disabled>Geen tijden beschikbaar voor deze dag</option>';
    }
    
    document.getElementById('editAppointmentKapper').value = appointment.kapper_id || '';
    document.getElementById('editAppointmentService').value = appointment.dienst_id || '';
    
    // Setup dynamic time slot updates
    setupAppointmentEditEventListeners();
  }
}

// Setup event listeners for dynamic time slot updates in appointment editing
async function setupAppointmentEditEventListeners() {
  const dateSelect = document.getElementById('editAppointmentDate');
  const kapperSelect = document.getElementById('editAppointmentKapper');
  const timeSelect = document.getElementById('editAppointmentTime');
  
  if (!dateSelect || !kapperSelect || !timeSelect) return;
  
  // Remove existing listeners to prevent duplicates
  dateSelect.removeEventListener('change', updateAppointmentTimeSlots);
  kapperSelect.removeEventListener('change', updateAppointmentTimeSlots);
  
  // Add new listeners
  dateSelect.addEventListener('change', updateAppointmentTimeSlots);
  kapperSelect.addEventListener('change', updateAppointmentTimeSlots);
  
  async function updateAppointmentTimeSlots() {
    const selectedDate = dateSelect.value;
    const selectedKapper = kapperSelect.value;
    
    if (selectedDate && selectedKapper) {
      timeSelect.innerHTML = '<option value="">Laden...</option>';
      timeSelect.disabled = true;
      
      try {
        const timeSlots = await generateKapperAvailableSlots(selectedKapper, selectedDate, currentEditingAppointment?.id);
        const currentTime = timeSelect.dataset.currentTime || '';
        
        timeSelect.innerHTML = '';
        if (timeSlots.length > 0) {
          timeSlots.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            option.selected = time === currentTime;
            timeSelect.appendChild(option);
          });
        } else {
          timeSelect.innerHTML = '<option value="" disabled>Geen tijden beschikbaar voor deze dag</option>';
        }
      } catch (error) {
        console.error('Error updating time slots:', error);
        timeSelect.innerHTML = '<option value="" disabled>Fout bij laden tijden</option>';
      } finally {
        timeSelect.disabled = false;
      }
    }
  }
}

async function saveAppointmentChanges() {
  if (!currentEditingAppointment) return;
  
  const appointmentId = currentEditingAppointment.id;
  const customerName = document.getElementById('editCustomerName').value.trim();
  const customerEmail = document.getElementById('editCustomerEmail').value.trim();
  const customerPhone = document.getElementById('editCustomerPhone').value.trim();
  const appointmentDate = document.getElementById('editAppointmentDate').value;
  const appointmentTime = document.getElementById('editAppointmentTime').value;
  const kapperId = document.getElementById('editAppointmentKapper').value;
  const serviceId = document.getElementById('editAppointmentService').value;
  
  // Validation
  if (!customerName || !appointmentDate || !appointmentTime || !kapperId || !serviceId) {
    await customAlert('Validatie Fout', 'Vul alle verplichte velden in!', 'OK');
    return;
  }
  
  // Combine date and time
  const newDateTime = `${appointmentDate}T${appointmentTime}:00`;
  
  // Check if the appointment would end after kapper shift end time
  try {
    const serviceDuration = await getServiceDuration(serviceId);
    const kapperAvailability = await fetchKapperAvailability(parseInt(kapperId));
    const appointmentDateObj = new Date(appointmentDate);
    const dayOfWeek = appointmentDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const workingHours = kapperAvailability?.find(avail => avail.day_of_week === dayName);
    
    if (workingHours) {
      const shiftEndTime = workingHours.end || '17:00';
      const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
      const shiftEndDateTime = new Date(appointmentDateObj);
      shiftEndDateTime.setHours(shiftEndHour, shiftEndMin, 0, 0);
      
      const [timeHour, timeMin] = appointmentTime.split(':').map(Number);
      const bookingStartDateTime = new Date(appointmentDateObj);
      bookingStartDateTime.setHours(timeHour, timeMin, 0, 0);
      const bookingEndDateTime = new Date(bookingStartDateTime.getTime() + serviceDuration * 60000);
      
      if (bookingEndDateTime > shiftEndDateTime) {
        const endTimeStr = bookingEndDateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const shiftEndStr = shiftEndDateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        await customAlert('Tijd Conflict', `Deze afspraak zou eindigen om ${endTimeStr}, maar de kapper werkt maar tot ${shiftEndStr}. Kies een eerder tijdstip.`, 'OK');
        return;
      }
    }
  } catch (error) {
    console.error('Error validating appointment time:', error);
    // Continue with save if validation fails (fallback)
  }
  
  try {
    // Update the appointment
    const { error } = await supabase
      .from('boekingen')
      .update({
        klantnaam: customerName,
        email: customerEmail,
        telefoon: customerPhone,
        datumtijd: newDateTime,
        kapper_id: parseInt(kapperId),
        dienst_id: parseInt(serviceId)
      })
      .eq('id', appointmentId);
    
    if (error) throw error;
    
    await customAlert('Succes', 'Afspraak succesvol bijgewerkt!', 'OK');
    
    // Hide edit form and refresh the week view
    hideEditForm();
    hideAppointmentDetails();
    
    // Refresh customer details if modal is open
    const customerId = currentEditingAppointment?.klant_id;
    if (customerId) {
      await showCustomerDetails(parseInt(customerId));
    }
    
    // Refresh week appointments
    await loadWeekAppointments();
    
    // Refresh statistics after appointment update
    if (typeof loadStatistics === 'function') {
      console.log('Refreshing statistics after appointment update');
      await loadStatistics();
    }
    
    // Reset edit mode
    currentEditingAppointment = null;
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    await customAlert('Fout', 'Fout bij bijwerken van afspraak: ' + error.message, 'OK');
  }
}

async function deleteCurrentAppointment() {
  if (!currentAppointment) return;
  
  if (!hasPermission('delete')) {
    alert('Je hebt geen toestemming om afspraken te verwijderen.');
    return;
  }
  
  if (confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) {
    try {
      const { error } = await supabase
        .from('boekingen')
        .delete()
        .eq('id', currentAppointment.id);
      
      if (error) throw error;
      
      alert('Afspraak succesvol verwijderd!');
      hideAppointmentDetails();
      loadWeekAppointments(); // Refresh the calendar
      
      // Refresh statistics after appointment deletion
      if (typeof loadStatistics === 'function') {
        console.log('Refreshing statistics after appointment deletion');
        await loadStatistics();
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de afspraak.');
    }
  }
}

function editAppointment() {
  if (!currentAppointment) return;
  
  // For now, just show an alert
  // In a full implementation, you would open an edit form
  alert('Bewerken functionaliteit komt binnenkort beschikbaar!');
}

async function loadKapperAvailabilityForWeek() {
  try {
    // Load all kapper availability
    const { data: availability, error } = await supabase
      .from('kapper_availability')
      .select('*');
    
    if (error) {
      console.error('Error loading kapper availability:', error);
      return;
    }
    
    // Group availability by kapper
    const availabilityByKapper = {};
    availability.forEach(avail => {
      if (!availabilityByKapper[avail.kapper_id]) {
        availabilityByKapper[avail.kapper_id] = [];
      }
      availabilityByKapper[avail.kapper_id].push(avail);
    });
    
    // Apply greyed out styling to unavailable times
    applyAvailabilityStyling(availabilityByKapper);
    
  } catch (error) {
    console.error('Error loading kapper availability:', error);
  }
}

function applyAvailabilityStyling(availabilityByKapper) {
  const dayColumns = document.querySelectorAll('.day-column');
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  dayColumns.forEach((column, index) => {
    const dayName = dayNames[index];
    const timelineContainer = column.querySelector('.timeline-container');
    
    if (!timelineContainer) return;
    
    // Remove existing overlay
    const existingOverlay = timelineContainer.querySelector('.unavailable-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create greyed out background for unavailable times
    const unavailableOverlay = document.createElement('div');
    unavailableOverlay.className = 'unavailable-overlay';
    timelineContainer.appendChild(unavailableOverlay);
    
    // Check if any kapper is available for this day
    const isAnyKapperAvailable = checkDayAvailability(availabilityByKapper, dayName);
    
    if (!isAnyKapperAvailable) {
      // Grey out the entire day if no kapper is available
      greyOutEntireDay(unavailableOverlay);
    } else {
      // Grey out specific time slots when no kapper is available
      greyOutUnavailableTimes(unavailableOverlay, availabilityByKapper, dayName);
    }
  });
}

function checkDayAvailability(availabilityByKapper, dayName) {
  // Check if any kapper is available on this day
  for (const kapperId in availabilityByKapper) {
    const kapperAvailability = availabilityByKapper[kapperId];
    const dayAvailability = kapperAvailability.find(avail => avail.day_of_week === dayName);
    if (dayAvailability) {
      return true;
    }
  }
  return false;
}

function greyOutEntireDay(overlay) {
  overlay.style.background = '#f8f9fa';
  overlay.style.opacity = '0.5';
  overlay.style.display = 'block';
}

function greyOutUnavailableTimes(overlay, availabilityByKapper, dayName) {
  // For now, show all times as available
  // In a full implementation, you would check each hour against kapper availability
  overlay.style.display = 'none';
}

function navigateWeek(direction) {
  console.log('🔥 navigateWeek called with direction:', direction);
  console.log('🔥 currentWeekStart before:', currentWeekStart);
  
  if (direction === 'prev') {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  } else {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  console.log('🔥 currentWeekStart after:', currentWeekStart);
  console.log('🔥 currentWeekEnd:', currentWeekEnd);
  
  updateWeekDisplay();
  
  // Reload appointments for the new week
  loadWeekAppointments();
}

window.addEventListener('DOMContentLoaded', async () => {
  // Only run admin functionality on admin pages
  if (!window.location.pathname.includes('admin.html')) {
    return;
  }
  
  // Initialize tabs first
  initTabs();
  
  // Initialize user management
  initUserManagement();
  
  // Initialize bookings list
  initBookingsList();
  
  // Stop auto-update when page is unloaded
  window.addEventListener('beforeunload', () => {
    stopBookingsAutoUpdate();
  });
  
  // Check authentication
  await checkAuth();
  
  
  // Load initial data
  await loadWeekAppointments();
  await loadKappers();
  await loadDiensten();
  await loadSettings();
  await loadCustomers();
  
  // Initialize klanten sub-tabs
  initKlantenSubTabs();
  
  // Add kapper button event listener
  const addKapperBtn = document.getElementById("addKapperBtn");
  if (addKapperBtn) {
    addKapperBtn.addEventListener("click", async () => {
      const name = document.getElementById("newKapperName").value.trim();
      if (!name) return alert("Vul een naam in!");
      const { error } = await supabase.from("kappers").insert([{ naam: name }]);
      if (error) { console.error(error); return alert("Fout bij toevoegen"); }
      document.getElementById("newKapperName").value = "";
      await loadKappers();
      // Also refresh kapper availability cards
      await loadKapperCards();
    });
  }
  
  // Initialize kappers
  await loadKappers();
  
  // Initialize kapper availability
  initKapperAvailability();
  
  // Initialize week calendar
  await initWeekCalendar();
  
  // Initialize statistics dashboard
  initializeStatisticsDashboard();
  
  // Initialize customer import functionality
  initializeCustomerImport();
  
  // Admin availability controls removed - now handled in Kappers tab
  
  // Add week navigation event listeners
  document.getElementById('prevWeekBtn')?.addEventListener('click', () => navigateWeek('prev'));
  document.getElementById('nextWeekBtn')?.addEventListener('click', () => navigateWeek('next'));
  
  
  // Add appointment popup event listeners
  document.getElementById('closeAppointmentPopup')?.addEventListener('click', hideAppointmentDetails);
  document.getElementById('closeAppointmentDetailsBtn')?.addEventListener('click', hideAppointmentDetails);
  document.getElementById('editAppointmentBtn')?.addEventListener('click', showEditForm);
  document.getElementById('deleteAppointmentBtn')?.addEventListener('click', deleteCurrentAppointment);
  
  // Edit form event listeners
  document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditForm);
  document.getElementById('saveAppointmentBtn')?.addEventListener('click', saveAppointmentChanges);
  
  // Close popup when clicking outside
  document.getElementById('appointmentDetailsPopup')?.addEventListener('click', (e) => {
    if (e.target.id === 'appointmentDetailsPopup') {
      hideAppointmentDetails();
    }
  });
});

// ====================== Theme Management ======================

// ====================== User Management ======================
async function loadUsers() {
  try {
    console.log('Loading users...');
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }
    
    const { data, error } = await sb
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading users:', error);
      
      // Check if it's a table not found error
      if (error.code === 'PGRST116' || error.message.includes('relation "admin_users" does not exist')) {
        const usersList = document.getElementById('usersList');
        if (usersList) {
          usersList.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; color: #856404;">
              <h4>⚠️ Database tabel niet gevonden</h4>
              <p>De admin_users tabel bestaat nog niet in de database.</p>
              <p><strong>Oplossing:</strong> Voer het SQL script uit in Supabase:</p>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 12px;">
                create_admin_users_simple.sql
              </div>
              <p>Na het uitvoeren van het script kun je gebruikers toevoegen.</p>
            </div>
          `;
        }
        return;
      }
      
      // Other errors
      const usersList = document.getElementById('usersList');
      if (usersList) {
        usersList.innerHTML = `
          <div style="text-align: center; padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
            <h4>❌ Fout bij laden gebruikers</h4>
            <p>Er is een fout opgetreden: ${error.message}</p>
            <p>Controleer je database verbinding en rechten.</p>
          </div>
        `;
      }
      return;
    }
    
    console.log('Users loaded:', data);
    renderUsers(data || []);
  } catch (error) {
    console.error('Error in loadUsers:', error);
    
    const usersList = document.getElementById('usersList');
    if (usersList) {
      usersList.innerHTML = `
        <div style="text-align: center; padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
          <h4>❌ Onverwachte fout</h4>
          <p>Er is een onverwachte fout opgetreden: ${error.message}</p>
        </div>
      `;
    }
  }
}

function renderUsers(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  if (!users || users.length === 0) {
    usersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen gebruikers gevonden.</p>';
    return;
  }
  
  const usersHTML = users.map(user => {
    const roleDisplay = getRoleDisplay(user.role);
    const roleClass = getRoleClass(user.role);
    
    return `
      <div class="user-card" data-user-id="${user.id}">
        <div class="user-info">
          <div class="user-email">${user.email}</div>
          <div class="user-role">${roleDisplay}</div>
        </div>
        <div class="user-actions">
          <select class="btn-role" onchange="changeUserRole('${user.id}', this.value)">
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>🔑 Administrator</option>
            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>👨‍💼 Manager</option>
            <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>👤 Medewerker</option>
            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>👁️ Bekijker</option>
          </select>
          <button class="btn-role btn-delete-user" onclick="deleteUser('${user.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  usersList.innerHTML = usersHTML;
}

function getRoleDisplay(role) {
  const roleMap = {
    'admin': '🔑 Administrator',
    'manager': '👨‍💼 Manager', 
    'staff': '👤 Medewerker',
    'viewer': '👁️ Bekijker'
  };
  return roleMap[role] || role;
}

function getRoleClass(role) {
  return `role-${role}`;
}

async function addUser() {
  try {
    if (currentUserRole !== 'admin') {
      alert('Alleen administrators kunnen nieuwe gebruikers toevoegen.');
      return;
    }
    
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    
    if (!email || !password || !role) {
      alert('Vul alle velden in.');
      return;
    }
    
    if (!isValidEmail(email)) {
      alert('Voer een geldig e-mailadres in.');
      return;
    }
    
    if (password.length < 6) {
      alert('Wachtwoord moet minimaal 6 karakters lang zijn.');
      return;
    }
    
    const sb = window.supabase;
    
    // Check if user already exists in admin_users table
    const { data: existingUser } = await sb
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      alert('Een gebruiker met dit email adres bestaat al in het systeem.');
      return;
    }
    
    // Try to create user - if it fails due to existing email, handle gracefully
    
    // Create new user using signUp (works with anon key)
    const { data: authData, error: authError } = await sb.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: window.location.origin + '/admin-login.html'
      }
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      
      // Handle specific error cases
      if (authError.message.includes('User already registered') || authError.message.includes('already been registered')) {
        // User exists in auth.users but not in admin_users - try to add them back
        console.log('User exists in auth.users, attempting to add back to admin_users');
        
        // We need to get the user ID somehow - try to sign in to get the user ID
        const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        if (signInData?.user) {
          // User exists and password is correct - add them back to admin_users
          const { data: userData, error: userError } = await sb
            .from('admin_users')
            .insert({
              id: signInData.user.id,
              email: email,
              role: role,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (!userError) {
            console.log('User re-added successfully:', userData);
            
            // Sign out the temporary user session
            await sb.auth.signOut();
            
            // Clear form
            document.getElementById('newUserEmail').value = '';
            document.getElementById('newUserPassword').value = '';
            document.getElementById('newUserRole').value = 'staff';
            
            // Reload users
            await loadUsers();
            
            alert('Gebruiker succesvol toegevoegd! Ze kunnen direct inloggen.');
            return;
          }
        }
        
        alert('Een gebruiker met dit email adres bestaat al in het systeem. Als dit een eerder verwijderde gebruiker is, contacteer de beheerder om het handmatig op te lossen.');
        return;
      }
      
      alert('Fout bij aanmaken gebruiker: ' + authError.message);
      return;
    }
    
    if (!authData.user) {
      alert('Gebruiker kon niet worden aangemaakt.');
      return;
    }
    
    // Add user to admin_users table
    const { data: userData, error: userError } = await sb
      .from('admin_users')
      .insert({
        id: authData.user.id,
        email: email,
        role: role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('User table error:', userError);
      
      // Check if it's a table not found error
      if (userError.code === 'PGRST116' || userError.message.includes('relation "admin_users" does not exist')) {
        alert('⚠️ Database tabel niet gevonden!\n\nVoer eerst het SQL script uit in Supabase:\ncreate_admin_users_simple.sql\n\nNa het uitvoeren kun je gebruikers toevoegen.');
        return;
      }
      
      alert('Fout bij opslaan gebruiker gegevens: ' + userError.message);
      return;
    }
    
    console.log('User created successfully:', userData);
    
    // Clear form
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserRole').value = 'staff';
    
    // Reload users
    await loadUsers();
    
    alert('Gebruiker succesvol toegevoegd! Ze kunnen direct inloggen.');
    
  } catch (error) {
    console.error('Error in addUser:', error);
    alert('Er is een fout opgetreden bij het toevoegen van de gebruiker: ' + error.message);
  }
}

async function changeUserRole(userId, newRole) {
  try {
    if (currentUserRole !== 'admin') {
      alert('Alleen administrators kunnen gebruikersrollen wijzigen.');
      return;
    }
    
    if (!confirm('Weet je zeker dat je de rol van deze gebruiker wilt wijzigen?')) {
      return;
    }
    
    const sb = window.supabase;
    
    const { error } = await sb
      .from('admin_users')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user role:', error);
      alert('Fout bij wijzigen van rol.');
      return;
    }
    
    console.log('User role updated successfully');
    await loadUsers();
    
  } catch (error) {
    console.error('Error in changeUserRole:', error);
    alert('Er is een fout opgetreden bij het wijzigen van de rol.');
  }
}

async function deleteUser(userId) {
  try {
    if (currentUserRole !== 'admin') {
      alert('Alleen administrators kunnen gebruikers verwijderen.');
      return;
    }
    
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }
    
    const sb = window.supabase;
    
    // Delete from admin_users table (this will also delete from auth.users due to CASCADE)
    const { error: userError } = await sb
      .from('admin_users')
      .delete()
      .eq('id', userId);
    
    if (userError) {
      console.error('Error deleting user from table:', userError);
      alert('Fout bij verwijderen van gebruiker: ' + userError.message);
      return;
    }
    
    console.log('User deleted successfully');
    await loadUsers();
    alert('Gebruiker succesvol verwijderd!');
    
  } catch (error) {
    console.error('Error in deleteUser:', error);
    alert('Er is een fout opgetreden bij het verwijderen van de gebruiker: ' + error.message);
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


function searchUsers() {
  const searchTerm = document.getElementById('userSearch').value.toLowerCase();
  const roleFilter = document.getElementById('roleFilter').value;
  
  const userCards = document.querySelectorAll('.user-card');
  
  userCards.forEach(card => {
    const email = card.querySelector('.user-email').textContent.toLowerCase();
    const role = card.querySelector('select').value;
    
    const matchesSearch = email.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    
    if (matchesSearch && matchesRole) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function initUserManagement() {
  // Add user button
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', addUser);
  }
  
  // Search functionality
  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', searchUsers);
  }
  
  const searchUserBtn = document.getElementById('searchUserBtn');
  if (searchUserBtn) {
    searchUserBtn.addEventListener('click', searchUsers);
  }
  
  // Role filter
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', searchUsers);
  }
  
  // Load users when settings tab is activated
  const gebruikersSettingsBtn = document.querySelector('button[onclick="switchSettingsTab(\'gebruikers\')"]');
  if (gebruikersSettingsBtn) {
    gebruikersSettingsBtn.addEventListener('click', () => {
      setTimeout(loadUsers, 100); // Small delay to ensure tab is active
    });
  }
}

// ====================== Settings Management ======================
async function loadSettings() {
  try {
    console.log('Loading settings...');
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }
    
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['loyalty_enabled', 'points_per_appointment', 'points_for_discount', 'discount_percentage', 'dark_mode_enabled', 'primary_color', 'secondary_color', 'background_color', 'text_color', 'site_title', 'time_slot_interval', 'max_advance_booking']);
    
    if (error) {
      console.error('Database error loading settings:', error);
      throw error;
    }
    
    console.log('Settings data from database:', data);
    
    // Set default values
    const settings = {
      loyalty_enabled: 'true',
      points_per_appointment: '25',
      points_for_discount: '100',
      discount_percentage: '50',
      dark_mode_enabled: 'true',
      primary_color: '#F28B82',
      secondary_color: '#e67e73',
      background_color: '#f8f9fa',
      text_color: '#333333',
      site_title: 'Boekingssysteem',
      time_slot_interval: '15',
      max_advance_booking: '30'
    };
    
    // Update with database values
    if (data && data.length > 0) {
      data.forEach(setting => {
        settings[setting.key] = setting.value;
        console.log(`Loaded setting: ${setting.key} = ${setting.value}`);
      });
    } else {
      console.log('No settings found in database, using defaults');
    }
    
    // Update UI
    const loyaltyEnabledEl = document.getElementById('loyaltyEnabled');
    const pointsPerAppointmentEl = document.getElementById('pointsPerAppointment');
    const pointsForDiscountEl = document.getElementById('pointsForDiscount');
    const discountPercentageEl = document.getElementById('discountPercentage');
    
    // Theme settings
    const darkModeEnabledEl = document.getElementById('darkModeEnabled');
    const primaryColorEl = document.getElementById('primaryColor');
    const secondaryColorEl = document.getElementById('secondaryColor');
    const backgroundColorEl = document.getElementById('backgroundColor');
    const textColorEl = document.getElementById('textColor');
    const siteTitleEl = document.getElementById('siteTitle');
    const timeSlotIntervalEl = document.getElementById('timeSlotInterval');
    const maxAdvanceBookingEl = document.getElementById('maxAdvanceBooking');
    
    // Apply loyalty settings
    if (loyaltyEnabledEl) loyaltyEnabledEl.checked = settings.loyalty_enabled === 'true';
    if (pointsPerAppointmentEl) pointsPerAppointmentEl.value = settings.points_per_appointment;
    if (pointsForDiscountEl) pointsForDiscountEl.value = settings.points_for_discount;
    if (discountPercentageEl) discountPercentageEl.value = settings.discount_percentage;
    
    // Apply theme settings
    if (darkModeEnabledEl) darkModeEnabledEl.checked = settings.dark_mode_enabled === 'true';
    if (primaryColorEl) primaryColorEl.value = settings.primary_color;
    if (secondaryColorEl) secondaryColorEl.value = settings.secondary_color;
    if (backgroundColorEl) backgroundColorEl.value = settings.background_color;
    if (textColorEl) textColorEl.value = settings.text_color;
    if (siteTitleEl) siteTitleEl.value = settings.site_title;
    if (timeSlotIntervalEl) timeSlotIntervalEl.value = settings.time_slot_interval;
    if (maxAdvanceBookingEl) maxAdvanceBookingEl.value = settings.max_advance_booking;
    
    // Apply theme to frontend
    applyThemeSettings(settings);
    
    console.log('Settings loaded successfully:', settings);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    // Use default values if database fails
    const loyaltyEnabledEl = document.getElementById('loyaltyEnabled');
    const pointsPerAppointmentEl = document.getElementById('pointsPerAppointment');
    const pointsForDiscountEl = document.getElementById('pointsForDiscount');
    const discountPercentageEl = document.getElementById('discountPercentage');
    
    if (loyaltyEnabledEl) loyaltyEnabledEl.checked = true;
    if (pointsPerAppointmentEl) pointsPerAppointmentEl.value = 25;
    if (pointsForDiscountEl) pointsForDiscountEl.value = 100;
    if (discountPercentageEl) discountPercentageEl.value = 50;
    
    // Set default theme settings
    const darkModeEnabledEl = document.getElementById('darkModeEnabled');
    const primaryColorEl = document.getElementById('primaryColor');
    const secondaryColorEl = document.getElementById('secondaryColor');
    const backgroundColorEl = document.getElementById('backgroundColor');
    const textColorEl = document.getElementById('textColor');
    const siteTitleEl = document.getElementById('siteTitle');
    const timeSlotIntervalEl = document.getElementById('timeSlotInterval');
    const maxAdvanceBookingEl = document.getElementById('maxAdvanceBooking');
    
    if (darkModeEnabledEl) darkModeEnabledEl.checked = true;
    if (primaryColorEl) primaryColorEl.value = '#F28B82';
    if (secondaryColorEl) secondaryColorEl.value = '#e67e73';
    if (backgroundColorEl) backgroundColorEl.value = '#f8f9fa';
    if (textColorEl) textColorEl.value = '#333333';
    if (siteTitleEl) siteTitleEl.value = 'Boekingssysteem';
    if (timeSlotIntervalEl) timeSlotIntervalEl.value = '15';
    if (maxAdvanceBookingEl) maxAdvanceBookingEl.value = '30';
    
    console.log('Using default settings due to error');
  }
}

async function saveSettings() {
  try {
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      alert('Database verbinding mislukt. Supabase client niet gevonden.');
      return;
    }
    
    const settings = {
      loyalty_enabled: document.getElementById('loyaltyEnabled').checked.toString(),
      points_per_appointment: document.getElementById('pointsPerAppointment').value,
      points_for_discount: document.getElementById('pointsForDiscount').value,
      discount_percentage: document.getElementById('discountPercentage').value,
      dark_mode_enabled: document.getElementById('darkModeEnabled').checked.toString(),
      primary_color: document.getElementById('primaryColor').value,
      secondary_color: document.getElementById('secondaryColor').value,
      background_color: document.getElementById('backgroundColor').value,
      text_color: document.getElementById('textColor').value,
      site_title: document.getElementById('siteTitle').value,
      time_slot_interval: document.getElementById('timeSlotInterval').value,
      max_advance_booking: document.getElementById('maxAdvanceBooking').value
    };
    
    console.log('Attempting to save settings:', settings);
    
    // Validate settings
    if (parseInt(settings.points_per_appointment) < 1 || parseInt(settings.points_per_appointment) > 100) {
      alert('Punten per afspraak moet tussen 1 en 100 zijn');
      return;
    }
    
    if (parseInt(settings.points_for_discount) < 1 || parseInt(settings.points_for_discount) > 1000) {
      alert('Punten voor korting moet tussen 1 en 1000 zijn');
      return;
    }
    
    if (parseInt(settings.discount_percentage) < 1 || parseInt(settings.discount_percentage) > 100) {
      alert('Korting percentage moet tussen 1 en 100 zijn');
      return;
    }
    
    // Save each setting individually
    for (const [key, value] of Object.entries(settings)) {
      console.log(`Saving ${key} = ${value}`);
      
      try {
        // First try to update existing record
        const { data: updateData, error: updateError } = await sb
          .from('settings')
          .update({ 
            value: value,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
          .select();
        
        if (updateError) {
          console.error(`Update error for ${key}:`, updateError);
          throw updateError;
        }
        
        // If no rows were updated, try to insert
        if (!updateData || updateData.length === 0) {
          console.log(`No existing record for ${key}, trying insert...`);
          
          const { error: insertError } = await sb
            .from('settings')
            .insert({ 
              key: key, 
              value: value,
              description: getSettingDescription(key),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error(`Insert error for ${key}:`, insertError);
            throw insertError;
          }
          
          console.log(`Successfully inserted ${key}`);
        } else {
          console.log(`Successfully updated ${key}`);
        }
        
      } catch (settingError) {
        console.error(`Failed to save ${key}:`, settingError);
        throw settingError;
      }
    }
    
    // Apply theme settings to frontend
    applyThemeSettings(settings);
    
    alert('Instellingen succesvol opgeslagen!');
    console.log('All settings saved successfully');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    const errorMessage = error.message || 'Onbekende fout';
    alert(`Fout bij opslaan van instellingen: ${errorMessage}`);
  }
}

function getSettingDescription(key) {
  const descriptions = {
    'loyalty_enabled': 'Enable loyalty program',
    'points_per_appointment': 'Points awarded per appointment',
    'points_for_discount': 'Points required for discount',
    'discount_percentage': 'Discount percentage when threshold is reached',
    'dark_mode_enabled': 'Enable dark mode toggle for users',
    'primary_color': 'Primary color of the website',
    'secondary_color': 'Secondary color for hover effects',
    'background_color': 'Background color of the website',
    'text_color': 'Base text color of the website',
    'site_title': 'Website title displayed in header',
    'time_slot_interval': 'Interval between available time slots',
    'max_advance_booking': 'Maximum days in advance customers can book'
  };
  return descriptions[key] || '';
}

function resetSettings() {
  if (confirm('Weet je zeker dat je alle instellingen wilt resetten naar de standaardwaarden?')) {
    // Loyalty settings
    document.getElementById('loyaltyEnabled').checked = true;
    document.getElementById('pointsPerAppointment').value = 25;
    document.getElementById('pointsForDiscount').value = 100;
    document.getElementById('discountPercentage').value = 50;
    
    // Theme settings
    document.getElementById('darkModeEnabled').checked = true;
    document.getElementById('primaryColor').value = '#F28B82';
    document.getElementById('secondaryColor').value = '#e67e73';
    document.getElementById('backgroundColor').value = '#f8f9fa';
    document.getElementById('textColor').value = '#333333';
    
    // Display settings
    document.getElementById('siteTitle').value = 'Boekingssysteem';
    document.getElementById('timeSlotInterval').value = '15';
    document.getElementById('maxAdvanceBooking').value = '30';
    
    alert('Instellingen gereset naar standaardwaarden. Klik "Opslaan" om de wijzigingen te bevestigen.');
  }
}

function applyThemeSettings(settings) {
  // Apply CSS custom properties
  const root = document.documentElement;
  
  if (settings.primary_color) {
    root.style.setProperty('--accent', settings.primary_color);
  }
  if (settings.secondary_color) {
    root.style.setProperty('--accent-hover', settings.secondary_color);
  }
  if (settings.background_color) {
    root.style.setProperty('--surface', settings.background_color);
  }
  if (settings.text_color) {
    root.style.setProperty('--text', settings.text_color);
  }
  
  // Update site title if it exists
  const siteTitleElement = document.querySelector('h1 a, .site-title');
  if (siteTitleElement && settings.site_title) {
    siteTitleElement.textContent = settings.site_title;
  }
  
  // Update page title
  if (settings.site_title) {
    document.title = settings.site_title;
  }
  
  console.log('Theme settings applied:', settings);
}

function previewTheme() {
  // Apply theme changes temporarily for preview
  const primaryColor = document.getElementById('primaryColor').value;
  const secondaryColor = document.getElementById('secondaryColor').value;
  const backgroundColor = document.getElementById('backgroundColor').value;
  const textColor = document.getElementById('textColor').value;
  
  // Create temporary CSS variables
  const style = document.createElement('style');
  style.id = 'theme-preview';
  style.textContent = `
    :root {
      --accent: ${primaryColor} !important;
      --accent-hover: ${secondaryColor} !important;
      --surface: ${backgroundColor} !important;
      --text: ${textColor} !important;
    }
  `;
  
  // Remove existing preview
  const existingPreview = document.getElementById('theme-preview');
  if (existingPreview) {
    existingPreview.remove();
  }
  
  // Add new preview
  document.head.appendChild(style);
  
  // Show preview message
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${primaryColor};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-weight: 600;
  `;
  message.textContent = '🎨 Thema voorbeeld actief - klik buiten dit bericht om te sluiten';
  document.body.appendChild(message);
  
  // Remove preview after 5 seconds or on click
  setTimeout(() => {
    if (message.parentNode) {
      message.remove();
    }
    if (style.parentNode) {
      style.remove();
    }
  }, 5000);
  
  message.addEventListener('click', () => {
    message.remove();
    style.remove();
  });
}

// Test function to check database connection
async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const sb = window.supabase;
    console.log('Supabase client:', sb);
    
    if (!sb) {
      console.error('Supabase client not found');
      return false;
    }
    
    // Test settings table directly
    const { data, error } = await sb
      .from('settings')
      .select('key, value')
      .limit(1);
    
    if (error) {
      console.error('Settings table error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'PGRST116') {
        console.log('Settings table does not exist - need to create it');
        return 'no_table';
      }
      
      if (error.code === 'PGRST301') {
        console.log('Permission denied - check RLS policies');
        return 'permission_denied';
      }
      
      return false;
    }
    
    console.log('Settings table connection successful');
    console.log('Found data:', data);
    return true;
  } catch (error) {
    console.error('Database test error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return false;
  }
}

// Add event listeners for settings
document.addEventListener('DOMContentLoaded', async () => {
  // Load current user info and apply role-based access control
  currentUser = await getCurrentUserInfo();
  if (currentUser) {
    currentUserRole = currentUser.role;
    console.log('Current user:', currentUser);
    applyRoleBasedAccess();
  } else {
    console.error('Could not load current user info');
    // Redirect to login if no user info
    window.location.href = 'admin-login.html';
    return;
  }
  // Settings event listeners
  document.getElementById('saveSettings')?.addEventListener('click', async () => {
    console.log('Save settings button clicked');
    const dbStatus = await testDatabaseConnection();
    
    if (dbStatus === false) {
      alert('Database verbinding mislukt. Controleer je internetverbinding en Supabase configuratie.');
      return;
    }
    
    if (dbStatus === 'no_table') {
      alert('Settings tabel bestaat niet. Ga naar Supabase Dashboard → SQL Editor en voer de create_settings_simple.sql uit.');
      return;
    }
    
    if (dbStatus === 'permission_denied') {
      alert('Geen toegang tot settings tabel. Controleer RLS policies in Supabase.');
      return;
    }
    
    if (dbStatus === true) {
      await saveSettings();
    }
  });

  document.getElementById('resetSettings')?.addEventListener('click', async () => {
    console.log('Reset settings button clicked');
    await resetSettingsToDefault();
  });
  document.getElementById('previewTheme')?.addEventListener('click', previewTheme);
  
  // Customer management event listeners
  document.getElementById('customerSearch')?.addEventListener('input', debounce(searchCustomers, 300));
  document.getElementById('searchBtn')?.addEventListener('click', searchCustomers);
  document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
});

// ====================== Customer Management ======================
let allCustomers = [];
let filteredCustomers = [];

async function loadCustomers() {
  try {
    console.log('Loading customers...');
    const sb = window.supabase;
    
    if (!sb) {
      console.error('Supabase client not found');
      return;
    }
    
    const { data, error } = await sb
      .from('customers')
      .select('*')
      .order('naam', { ascending: true });
    
    if (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
    
    allCustomers = data || [];
    filteredCustomers = [...allCustomers];
    
    console.log('Loaded customers:', allCustomers.length);
    await renderCustomers();
    
  } catch (error) {
    console.error('Error loading customers:', error);
    document.getElementById('customerList').innerHTML = '<div class="error">Fout bij laden van klanten</div>';
  }
}

async function renderCustomers() {
  const container = document.getElementById('customerList');
  if (!container) {
    console.error('customerList container not found');
    return;
  }
  
  if (filteredCustomers.length === 0) {
    container.innerHTML = '<div class="no-customers">Geen klanten gevonden</div>';
    return;
  }
  
        // Load appointment counts for each customer
        const customersWithCounts = await Promise.all(
          filteredCustomers.map(async (customer) => {
            try {
              const sb = window.supabase;
              const { count } = await sb
                .from('boekingen')
                .select('*', { count: 'exact', head: true })
                .eq('email', customer.email);
              
              return {
                ...customer,
                appointmentCount: count || 0
              };
            } catch (error) {
              console.error('Error loading appointment count for customer:', customer.naam, error);
              return {
                ...customer,
                appointmentCount: 0
              };
            }
          })
        );
        
        container.innerHTML = customersWithCounts.map(customer => `
          <div class="customer-card" data-customer-id="${customer.id}" style="cursor: pointer;">
            <div class="customer-info">
              <h3>${customer.naam}</h3>
              <p>${customer.email}</p>
              <p>${customer.telefoon || 'Geen telefoon'}</p>
            </div>
            <div class="customer-stats">
              <span class="appointment-count">${customer.appointmentCount} afspraken</span>
              <span class="loyalty-points">${customer.loyaliteitspunten || 0} punten</span>
            </div>
          </div>
        `).join('');
  
  // Add event listeners to customer cards
  container.querySelectorAll('.customer-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const customerId = parseInt(card.getAttribute('data-customer-id'));
      console.log('Customer card clicked, ID:', customerId);
      showCustomerDetails(customerId);
    });
  });
}

async function searchCustomers() {
  const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
  
  if (!searchTerm) {
    filteredCustomers = [...allCustomers];
  } else {
    filteredCustomers = allCustomers.filter(customer => 
      customer.naam.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm)
    );
  }
  
  await renderCustomers();
}

async function applyFilters() {
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  
  let filtered = [...allCustomers];
  
  if (statusFilter === 'active') {
    filtered = filtered.filter(customer => (customer.totaal_afspraken || 0) > 0);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(customer => (customer.totaal_afspraken || 0) === 0);
  }
  
  // Apply search filter
  const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter(customer => 
      customer.naam.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm)
    );
  }
  
  filteredCustomers = filtered;
  await renderCustomers();
}

async function showCustomerDetails(customerId) {
  try {
    const sb = window.supabase;
    const customer = allCustomers.find(c => c.id === customerId);
    
    if (!customer) {
      alert('Klant niet gevonden');
      return;
    }
    
    // Load customer appointments
    const { data: appointments, error: appointmentsError } = await sb
      .from('boekingen')
      .select('*')
      .eq('email', customer.email)
      .order('datumtijd', { ascending: false });
    
    if (appointmentsError) throw appointmentsError;
    
    // Enrich appointments with kapper and service data
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const kapperData = await getKapperData(appointment.kapper_id);
        const serviceData = await getServiceData(appointment.dienst_id);
        
        return {
          ...appointment,
          kapper_naam: kapperData?.naam || 'Onbekend',
          dienst_naam: serviceData?.naam || 'Onbekend',
          dienst_prijs: serviceData?.prijs_euro || 0
        };
      })
    );
    
    // Show customer details modal
    showCustomerModal(customer, enrichedAppointments);
    
  } catch (error) {
    console.error('Error loading customer details:', error);
    alert('Fout bij laden van klant details');
  }
}

function showCustomerModal(customer, appointments) {
  
  // Separate past and upcoming appointments
  const now = new Date();
  const pastAppointments = appointments.filter(apt => new Date(apt.datumtijd) < now);
  const upcomingAppointments = appointments.filter(apt => new Date(apt.datumtijd) >= now);
  
  // Create modal HTML
  const modalHTML = `
    <div class="modal" id="customerModal" data-customer-id="${customer.id}">
      <div class="modal-content">
        <div class="customer-detail-header">
          <h2>${customer.naam}</h2>
          <div class="header-actions">
            <button class="btn btn-primary btn-sm" onclick="window.editCustomer(${customer.id})">
              <span class="btn-icon">✏️</span> Bewerken
            </button>
            <button class="close-modal" onclick="window.closeCustomerModal()">&times;</button>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Contactgegevens</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Email:</label>
              <span id="customer-email">${customer.email}</span>
            </div>
            <div class="info-item">
              <label>Telefoon:</label>
              <span id="customer-phone">${customer.telefoon || 'Niet opgegeven'}</span>
            </div>
            <div class="info-item">
              <label>Geboortedatum:</label>
              <span id="customer-birthdate">${customer.geboortedatum ? new Date(customer.geboortedatum).toLocaleDateString('nl-NL') : 'Niet opgegeven'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Statistieken</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <label>Totaal afspraken:</label>
              <span class="stat-value">${appointments.length}</span>
            </div>
            <div class="stat-item">
              <label>Loyaliteitspunten:</label>
              <span class="stat-value loyalty-points">${customer.loyaliteitspunten || 0}</span>
            </div>
            <div class="stat-item">
              <label>Laatste afspraak:</label>
              <span class="stat-value">${customer.laatste_afspraak ? new Date(customer.laatste_afspraak).toLocaleDateString('nl-NL') : 'Geen'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Aankomende Afspraken (${upcomingAppointments.length})</h3>
          <div class="appointments-list">
            ${upcomingAppointments.length > 0 ? upcomingAppointments.map(apt => `
              <div class="appointment-item upcoming">
                <div class="appointment-date">${new Date(apt.datumtijd).toLocaleDateString('nl-NL')}</div>
                <div class="appointment-time">${new Date(apt.datumtijd).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}</div>
                <div class="appointment-service">${apt.dienst_naam}</div>
                <div class="appointment-kapper">${apt.kapper_naam}</div>
                <div class="appointment-price">€${apt.dienst_prijs}</div>
                <div class="appointment-actions">
                  <button class="btn-edit-appointment" onclick="editAppointment(${apt.id})" title="Bewerken">
                    <span>✏️</span>
                  </button>
                  <button class="btn-delete-appointment" onclick="deleteAppointment(${apt.id})" title="Verwijderen">
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            `).join('') : '<p class="no-appointments">Geen aankomende afspraken</p>'}
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Afgelopen Afspraken (${pastAppointments.length})</h3>
          <div class="appointments-list">
            ${pastAppointments.length > 0 ? pastAppointments.slice(0, 5).map(apt => `
              <div class="appointment-item past">
                <div class="appointment-date">${new Date(apt.datumtijd).toLocaleDateString('nl-NL')}</div>
                <div class="appointment-time">${new Date(apt.datumtijd).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}</div>
                <div class="appointment-service">${apt.dienst_naam}</div>
                <div class="appointment-kapper">${apt.kapper_naam}</div>
                <div class="appointment-price">€${apt.dienst_prijs}</div>
              </div>
            `).join('') : '<p class="no-appointments">Geen afgelopen afspraken</p>'}
            ${pastAppointments.length > 5 ? `<p class="more-appointments">... en ${pastAppointments.length - 5} meer</p>` : ''}
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Notities</h3>
          <div class="notes-section">
            <div class="add-note">
              <textarea id="new-note" placeholder="Voeg een notitie toe..." rows="3"></textarea>
              <button class="btn btn-primary" onclick="addCustomerNote(${customer.id})">Notitie Toevoegen</button>
            </div>
            <div class="notes-list" id="notes-list-${customer.id}">
              ${customer.notities ? customer.notities.map(note => `
                <div class="note-item">
                  <div class="note-content">${note.content}</div>
                  <div class="note-date">${new Date(note.created_at).toLocaleDateString('nl-NL')}</div>
                  <button class="btn-delete-note" onclick="deleteCustomerNote(${customer.id}, ${note.id})">×</button>
                </div>
              `).join('') : '<p class="no-notes">Geen notities</p>'}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listener for modal close on background click
  const modal = document.getElementById('customerModal');
  if (modal) {
    // Ensure modal is visible
    modal.style.display = 'block';
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCustomerModal();
      }
    });
  } else {
    console.error('Modal element not found after adding to page');
  }
}

function closeCustomerModal() {
  const modal = document.getElementById('customerModal');
  if (modal) {
    modal.remove();
  }
}

function editCustomer(customerId) {
  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) {
    alert('Klant niet gevonden');
    return;
  }
  
  // Create edit modal
  const editModalHTML = `
    <div class="modal" id="editCustomerModal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001;">
      <div class="modal-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div class="edit-customer-header">
          <h2>Klant Bewerken: ${customer.naam}</h2>
          <button class="close-edit" onclick="window.closeEditModal()">&times;</button>
        </div>
        
        <form id="editCustomerForm" class="edit-customer-form">
          <div class="form-row">
            <div class="form-group">
              <label for="edit-name">Naam:</label>
              <input type="text" id="edit-name" value="${customer.naam}" required>
            </div>
            <div class="form-group">
              <label for="edit-email">Email:</label>
              <input type="email" id="edit-email" value="${customer.email}" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-phone">Telefoon:</label>
              <input type="tel" id="edit-phone" value="${customer.telefoon || ''}">
            </div>
            <div class="form-group">
              <label for="edit-birthdate">Geboortedatum:</label>
              <input type="date" id="edit-birthdate" value="${customer.geboortedatum || ''}">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-loyalty-points">Loyaliteitspunten:</label>
              <input type="number" id="edit-loyalty-points" value="${customer.loyaliteitspunten || 0}" min="0">
            </div>
            <div class="form-group">
              <label for="edit-total-appointments">Totaal Afspraken:</label>
              <input type="number" id="edit-total-appointments" value="${customer.totaal_afspraken || 0}" min="0" readonly>
              <small>Dit wordt automatisch bijgewerkt</small>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="window.closeEditModal()">Annuleren</button>
            <button type="submit" class="btn btn-primary">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add edit modal to page
  document.body.insertAdjacentHTML('beforeend', editModalHTML);
  
  // Add form submit handler
  document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateCustomer(customerId);
  });
}

async function updateCustomer(customerId) {
  try {
    const sb = window.supabase;
    
    const updatedData = {
      naam: document.getElementById('edit-name').value,
      email: document.getElementById('edit-email').value,
      telefoon: document.getElementById('edit-phone').value || null,
      geboortedatum: document.getElementById('edit-birthdate').value || null,
      loyaliteitspunten: parseInt(document.getElementById('edit-loyalty-points').value) || 0
    };
    
    const { error } = await sb
      .from('customers')
      .update(updatedData)
      .eq('id', customerId);
    
    if (error) throw error;
    
    // Update local data
    const customerIndex = allCustomers.findIndex(c => c.id === customerId);
    if (customerIndex !== -1) {
      allCustomers[customerIndex] = { ...allCustomers[customerIndex], ...updatedData };
      filteredCustomers = [...allCustomers];
    }
    
    // Close edit modal
    closeEditModal();
    
    // Refresh customer list and customer details if modal is open
    await renderCustomers();
    
    // If customer details modal is open, refresh it
    const customerModal = document.getElementById('customerDetailModal');
    if (customerModal && customerModal.style.display !== 'none') {
      await showCustomerDetails(customerId);
    }
    
    await customAlert('Succes', 'Klant succesvol bijgewerkt!', 'OK');
    
  } catch (error) {
    console.error('Error updating customer:', error);
    alert('Fout bij bijwerken van klant');
  }
}

function closeEditModal() {
  const modal = document.getElementById('editCustomerModal');
  if (modal) {
    modal.remove();
  }
}

// Notities functionaliteit
async function addCustomerNote(customerId) {
  const noteContent = document.getElementById('new-note').value.trim();
  if (!noteContent) {
    alert('Voer een notitie in');
    return;
  }
  
  try {
    const sb = window.supabase;
    const { error } = await sb
      .from('customer_notes')
      .insert({
        customer_id: customerId,
        content: noteContent
      });
    
    if (error) throw error;
    
    // Clear textarea
    document.getElementById('new-note').value = '';
    
    // Refresh customer details
    showCustomerDetails(customerId);
    
  } catch (error) {
    console.error('Error adding note:', error);
    alert('Fout bij toevoegen van notitie');
  }
}

async function deleteCustomerNote(customerId, noteId) {
  if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
  
  try {
    const sb = window.supabase;
    const { error } = await sb
      .from('customer_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
    
    // Refresh customer details
    showCustomerDetails(customerId);
    
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Fout bij verwijderen van notitie');
  }
}

function toggleAppointmentManagement(customerId) {
  // This function is now handled by the inline appointment actions
  console.log('Appointment management toggled for customer:', customerId);
}

async function editAppointment(appointmentId) {
  try {
    const sb = window.supabase;
    
    // Get appointment details
    const { data: appointment, error: fetchError } = await sb
      .from('boekingen')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Get kapper and service data
    const kapperData = await getKapperData(appointment.kapper_id);
    const serviceData = await getServiceData(appointment.dienst_id);
    
    // Get all services and kappers for dropdowns
    const { data: allServices } = await sb.from('diensten').select('*').order('naam');
    const { data: allKappers } = await sb.from('kappers').select('*').order('naam');
    
    // Create edit modal
    const editModalHTML = `
      <div class="modal" id="editAppointmentModal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1002;">
        <div class="modal-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
          <div class="edit-appointment-header">
            <h2>Afspraak Bewerken</h2>
            <button class="close-edit" onclick="closeEditAppointmentModal()">&times;</button>
          </div>
          
          <form id="editAppointmentForm" class="edit-appointment-form">
            <div class="form-group">
              <label for="edit-apt-date">Datum:</label>
              <input type="date" id="edit-apt-date" value="${appointment.datumtijd.split('T')[0]}" required>
            </div>
            
            <div class="form-group">
              <label for="edit-apt-time">Tijd:</label>
              <select id="edit-apt-time" required>
                ${generateQuarterHourSlots().map(time => 
                  `<option value="${time}" ${time === appointment.datumtijd.split('T')[1].substring(0, 5) ? 'selected' : ''}>${time}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="edit-apt-service">Dienst:</label>
              <select id="edit-apt-service" required>
                ${allServices.map(service => `
                  <option value="${service.id}" ${service.id === appointment.dienst_id ? 'selected' : ''}>
                    ${service.naam} - €${service.prijs_euro}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="edit-apt-kapper">Kapper:</label>
              <select id="edit-apt-kapper" required>
                ${allKappers.map(kapper => `
                  <option value="${kapper.id}" ${kapper.id === appointment.kapper_id ? 'selected' : ''}>
                    ${kapper.naam}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeEditAppointmentModal()">Annuleren</button>
              <button type="submit" class="btn btn-primary">Opslaan</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add edit modal to page
    document.body.insertAdjacentHTML('beforeend', editModalHTML);
    
    // Add form submit handler
    document.getElementById('editAppointmentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateAppointment(appointmentId);
    });
    
  } catch (error) {
    console.error('Error editing appointment:', error);
    alert('Fout bij laden van afspraak details');
  }
}

async function updateAppointment(appointmentId) {
  try {
    const sb = window.supabase;
    
    // Get form values
    const date = document.getElementById('edit-apt-date').value;
    const time = document.getElementById('edit-apt-time').value;
    const serviceId = document.getElementById('edit-apt-service').value;
    const kapperId = document.getElementById('edit-apt-kapper').value;
    
    // Validation
    if (!date || !time || !serviceId || !kapperId) {
      alert('Vul alle verplichte velden in!');
      return;
    }
    
    const newDateTime = `${date}T${time}:00`;
    
    // Get service duration for end time calculation
    const { data: service } = await sb
      .from('diensten')
      .select('duur_minuten')
      .eq('id', serviceId)
      .single();
    
    if (!service) {
      alert('Service niet gevonden!');
      return;
    }
    
    // Calculate end time
    const beginDateTime = new Date(newDateTime);
    const eindDateTime = new Date(beginDateTime.getTime() + service.duur_minuten * 60000);
    const beginTijd = beginDateTime.toTimeString().substring(0, 8);
    const eindTijd = eindDateTime.toTimeString().substring(0, 8);
    
    // Check for overlapping appointments (excluding current appointment)
    const { data: existingBookings } = await sb
      .from('boekingen')
      .select('*')
      .eq('kapper_id', kapperId)
      .eq('datumtijd::date', date)
      .neq('id', appointmentId);
    
    // Check for overlaps
    for (const booking of existingBookings || []) {
      const existingBegin = new Date(booking.datumtijd);
      const existingEind = new Date(existingBegin.getTime() + (booking.duur_minuten || 30) * 60000);
      
      if ((beginDateTime < existingEind && eindDateTime > existingBegin)) {
        alert(`Deze tijd overlapt met een bestaande afspraak van ${existingBegin.toTimeString().substring(0, 5)} tot ${existingEind.toTimeString().substring(0, 5)}`);
        return;
      }
    }
    
    // Update the appointment with all required fields
    const { error } = await sb
      .from('boekingen')
      .update({
        datumtijd: newDateTime,
        begin_tijd: beginTijd,
        eind_tijd: eindTijd,
        dienst_id: parseInt(serviceId),
        kapper_id: parseInt(kapperId)
      })
      .eq('id', appointmentId);
    
    if (error) throw error;
    
    // Close edit modal
    closeEditAppointmentModal();
    
    // Refresh customer details
    const customerId = document.querySelector('#customerModal')?.dataset.customerId;
    if (customerId) {
      await showCustomerDetails(parseInt(customerId));
    }
    
    // Also refresh the main appointments view if visible
    if (document.getElementById('appointmentsContainer')) {
      loadWeekAppointments();
    }
    
    // Refresh bookings list if visible
    if (document.getElementById('bookingsList')) {
      loadBookingsList();
    }
    
    // Refresh statistics after appointment update
    if (typeof loadStatistics === 'function') {
      console.log('Refreshing statistics after appointment update');
      await loadStatistics();
    }
    
    await customAlert('Succes', 'Afspraak succesvol bijgewerkt!', 'OK');
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    alert('Fout bij bijwerken van afspraak: ' + error.message);
  }
}

function closeEditAppointmentModal() {
  const modal = document.getElementById('editAppointmentModal');
  if (modal) {
    modal.remove();
  }
}

async function deleteAppointment(appointmentId) {
  const confirmed = await customConfirm(
    'Afspraak Verwijderen',
    'Weet je zeker dat je deze afspraak wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
    'Verwijderen',
    'Annuleren'
  );
  
  if (!confirmed) return;
  
  try {
    const sb = window.supabase;
    
    // Ensure appointmentId is a number, not an event object
    const id = typeof appointmentId === 'number' ? appointmentId : parseInt(appointmentId);
    
    if (isNaN(id)) {
      console.error('Invalid appointment ID:', appointmentId);
      alert('Ongeldige afspraak ID');
      return;
    }
    
    console.log('Deleting appointment with ID:', id);
    
    const { error } = await sb
      .from('boekingen')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Refresh customer details
    const customerId = document.querySelector('#customerModal')?.dataset.customerId;
    if (customerId) {
      await showCustomerDetails(parseInt(customerId));
    }
    
    // Also refresh the main appointments view if visible
    if (document.getElementById('appointmentsContainer')) {
      loadWeekAppointments();
    }
    
    // Refresh bookings list if visible
    if (document.getElementById('bookingsList')) {
      loadBookingsList();
    }
    
    // Refresh statistics after appointment deletion
    if (typeof loadStatistics === 'function') {
      console.log('Refreshing statistics after appointment deletion');
      await loadStatistics();
    }
    
    await customAlert('Succes', 'Afspraak succesvol verwijderd!', 'OK');
    
  } catch (error) {
    console.error('Error deleting appointment:', error);
    alert('Fout bij verwijderen van afspraak: ' + error.message);
  }
}

function closeEditAppointmentModal() {
  const modal = document.getElementById('editAppointmentModal');
  if (modal) {
    modal.remove();
  }
}

// Make functions globally available
window.showCustomerDetails = showCustomerDetails;
window.closeCustomerModal = closeCustomerModal;
window.editCustomer = editCustomer;
window.closeEditModal = closeEditModal;
window.addCustomerNote = addCustomerNote;
window.deleteCustomerNote = deleteCustomerNote;
window.toggleAppointmentManagement = toggleAppointmentManagement;
window.editAppointment = editAppointment;
window.deleteAppointment = deleteAppointment;
window.closeEditAppointmentModal = closeEditAppointmentModal;

// Helper functions
async function getKapperData(kapperId) {
  try {
    const sb = window.supabase;
    const { data, error } = await sb
      .from('kappers')
      .select('naam')
      .eq('id', kapperId)
      .single();
    
    return error ? null : data;
  } catch (error) {
    console.error('Error fetching kapper data:', error);
    return null;
  }
}

async function getServiceData(serviceId) {
  try {
    const sb = window.supabase;
    const { data, error } = await sb
      .from('diensten')
      .select('naam, prijs_euro')
      .eq('id', serviceId)
      .single();
    
    return error ? null : data;
  } catch (error) {
    console.error('Error fetching service data:', error);
    return null;
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ====================== Statistics Dashboard ======================
function initializeStatisticsDashboard() {
  console.log('Initializing statistics dashboard...');
  
  // Add event listeners
  const refreshStatsBtn = document.getElementById('refreshStats');
  const statsDateRange = document.getElementById('statsDateRange');
  
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', loadStatistics);
  }
  
  if (statsDateRange) {
    statsDateRange.addEventListener('change', loadStatistics);
  }
  
  // Load initial statistics
  loadStatistics();
  
  // Set up auto-refresh every 30 seconds when on statistics tab
  setInterval(() => {
    const statsTab = document.getElementById('statistieken');
    if (statsTab && statsTab.classList.contains('active')) {
      console.log('Auto-refreshing statistics...');
      loadStatistics();
    }
  }, 30000); // 30 seconds
  
  // Add real-time indicator
  addRealTimeIndicator();
}

function addRealTimeIndicator() {
  const controlsContainer = document.querySelector('.stats-controls');
  if (controlsContainer) {
    const indicator = document.createElement('div');
    indicator.className = 'realtime-indicator';
    indicator.innerHTML = `
      <span class="realtime-dot"></span>
      <span class="realtime-text">Live Data</span>
    `;
    indicator.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    `;
    
    const dot = indicator.querySelector('.realtime-dot');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    `;
    
    controlsContainer.appendChild(indicator);
  }
}

async function loadStatistics() {
  try {
    console.log('Loading statistics...');
    
    const dateRange = document.getElementById('statsDateRange')?.value || '30';
    const days = parseInt(dateRange);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    console.log(`Loading statistics for period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Load statistics (chart separately to ensure Chart.js is loaded)
    await Promise.all([
      loadRevenueStats(startDate, endDate),
      loadKapperRevenueStats(startDate, endDate),
      loadServiceStats(startDate, endDate),
      loadCustomerInsights(startDate, endDate)
    ]);
    
    // Load chart after a small delay to ensure Chart.js is ready
    setTimeout(() => {
      loadDailyRevenueChart(startDate, endDate);
    }, 100);
    
    console.log('Statistics loaded successfully');
    
  } catch (error) {
    console.error('Error loading statistics:', error);
    alert('Fout bij laden van statistieken: ' + error.message);
  }
}

async function getRevenueForPeriod(sb, startDate, endDate) {
  try {
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, datumtijd, dienst_id, kapper_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: false });
    
    if (error) throw error;
    
    // Get service details
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, naam, prijs_euro, duur_minuten')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Combine appointments with service data
    const appointmentsWithServices = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 }
    }));
    
    // Calculate totals
    const totalRevenue = appointmentsWithServices.reduce((sum, appointment) => {
      const price = appointment.diensten?.prijs_euro || 0;
      return sum + price;
    }, 0);
    
    const totalAppointments = appointmentsWithServices.length;
    const avgRevenuePerAppointment = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    
    return {
      totalRevenue,
      totalAppointments,
      avgRevenuePerAppointment
    };
  } catch (error) {
    console.error('Error getting revenue for period:', error);
    return {
      totalRevenue: 0,
      totalAppointments: 0,
      avgRevenuePerAppointment: 0
    };
  }
}

async function loadRevenueStats(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // First get all appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, datumtijd, dienst_id, kapper_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: false });
    
    if (error) throw error;
    
    // Then get service details for each appointment
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, naam, prijs_euro, duur_minuten')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Combine appointments with service data
    const appointmentsWithServices = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 }
    }));
    
    // Calculate total revenue from actual service prices
    const totalRevenue = appointmentsWithServices.reduce((sum, appointment) => {
      const price = appointment.diensten?.prijs_euro || 0;
      return sum + price;
    }, 0);
    
    // Calculate total appointments
    const totalAppointments = appointmentsWithServices.length;
    
    // Calculate average revenue per appointment
    const avgRevenuePerAppointment = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    
    // Find busiest day
    const dayStats = {};
    appointmentsWithServices.forEach(appointment => {
      const day = appointment.datumtijd.split('T')[0];
      dayStats[day] = (dayStats[day] || 0) + 1;
    });
    
    const busiestDay = Object.keys(dayStats).length > 0 ? 
      Object.keys(dayStats).reduce((a, b) => dayStats[a] > dayStats[b] ? a : b) : 'Geen data';
    
    const busiestDayCount = dayStats[busiestDay] || 0;
    
    // Update UI with real-time data
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalAppointmentsEl = document.getElementById('totalAppointments');
    const avgRevenueEl = document.getElementById('avgRevenuePerAppointment');
    const busiestDayEl = document.getElementById('busiestDay');
    const busiestDayCountEl = document.getElementById('busiestDayCount');
    
    if (totalRevenueEl) {
      totalRevenueEl.textContent = `€${totalRevenue.toFixed(2)}`;
      // Add animation for live updates
      totalRevenueEl.style.transform = 'scale(1.05)';
      setTimeout(() => totalRevenueEl.style.transform = 'scale(1)', 200);
    }
    
    if (totalAppointmentsEl) {
      totalAppointmentsEl.textContent = totalAppointments.toString();
      totalAppointmentsEl.style.transform = 'scale(1.05)';
      setTimeout(() => totalAppointmentsEl.style.transform = 'scale(1)', 200);
    }
    
    if (avgRevenueEl) {
      avgRevenueEl.textContent = `€${avgRevenuePerAppointment.toFixed(2)}`;
      avgRevenueEl.style.transform = 'scale(1.05)';
      setTimeout(() => avgRevenueEl.style.transform = 'scale(1)', 200);
    }
    
    if (busiestDayEl) {
      busiestDayEl.textContent = busiestDay !== 'Geen data' ? 
        new Date(busiestDay).toLocaleDateString('nl-NL', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }) : 'Geen data';
    }
    
    if (busiestDayCountEl) {
      busiestDayCountEl.textContent = `${busiestDayCount} afspraken`;
    }
    
    // Calculate previous period for comparison
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(endDate);
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);
    
    // Get previous period data
    const previousPeriodData = await getRevenueForPeriod(sb, previousPeriodStart, previousPeriodEnd);
    
    // Calculate percentage changes
    const revenueChange = previousPeriodData.totalRevenue > 0 ? 
      (((totalRevenue - previousPeriodData.totalRevenue) / previousPeriodData.totalRevenue) * 100) : 0;
    
    const appointmentsChange = previousPeriodData.totalAppointments > 0 ? 
      (((totalAppointments - previousPeriodData.totalAppointments) / previousPeriodData.totalAppointments) * 100) : 0;
    
    const avgRevenueChange = previousPeriodData.avgRevenuePerAppointment > 0 ? 
      (((avgRevenuePerAppointment - previousPeriodData.avgRevenuePerAppointment) / previousPeriodData.avgRevenuePerAppointment) * 100) : 0;
    
    // Update percentage change elements
    const revenueChangeEl = document.getElementById('revenueChange');
    const appointmentsChangeEl = document.getElementById('appointmentsChange');
    const avgRevenueChangeEl = document.getElementById('avgRevenueChange');
    
    if (revenueChangeEl) {
      const changeText = revenueChange >= 0 ? `+${revenueChange.toFixed(1)}%` : `${revenueChange.toFixed(1)}%`;
      const changeClass = revenueChange >= 0 ? 'positive' : 'negative';
      revenueChangeEl.textContent = changeText;
      revenueChangeEl.className = `stats-change ${changeClass}`;
    }
    
    if (appointmentsChangeEl) {
      const changeText = appointmentsChange >= 0 ? `+${appointmentsChange.toFixed(1)}%` : `${appointmentsChange.toFixed(1)}%`;
      const changeClass = appointmentsChange >= 0 ? 'positive' : 'negative';
      appointmentsChangeEl.textContent = changeText;
      appointmentsChangeEl.className = `stats-change ${changeClass}`;
    }
    
    if (avgRevenueChangeEl) {
      const changeText = avgRevenueChange >= 0 ? `+${avgRevenueChange.toFixed(1)}%` : `${avgRevenueChange.toFixed(1)}%`;
      const changeClass = avgRevenueChange >= 0 ? 'positive' : 'negative';
      avgRevenueChangeEl.textContent = changeText;
      avgRevenueChangeEl.className = `stats-change ${changeClass}`;
    }
    
    // Store current data for comparison
    window.lastRevenueStats = {
      totalRevenue,
      totalAppointments,
      avgRevenuePerAppointment,
      busiestDay,
      busiestDayCount,
      timestamp: new Date()
    };
    
    console.log('Revenue stats loaded (real-time):', { 
      totalRevenue, 
      totalAppointments, 
      avgRevenuePerAppointment, 
      busiestDay,
      appointmentCount: appointmentsWithServices.length,
      services: appointmentsWithServices.map(a => ({
        service: a.diensten?.naam,
        price: a.diensten?.prijs_euro,
        date: a.datumtijd
      }))
    });
    
  } catch (error) {
    console.error('Error loading revenue stats:', error);
    
    // Show error in UI
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
      totalRevenueEl.textContent = 'Error';
      totalRevenueEl.style.color = '#ef4444';
    }
  }
}

async function loadKapperRevenueStats(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, kapper_id, dienst_id, datumtijd')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: false });
    
    if (error) throw error;
    
    // Get unique service and kapper IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    const kapperIds = [...new Set(appointments.map(apt => apt.kapper_id))];
    
    // Fetch services and kappers data
    const [servicesResult, kappersResult] = await Promise.all([
      sb.from('diensten').select('id, naam, prijs_euro, duur_minuten').in('id', serviceIds),
      sb.from('kappers').select('id, naam').in('id', kapperIds)
    ]);
    
    if (servicesResult.error) throw servicesResult.error;
    if (kappersResult.error) throw kappersResult.error;
    
    // Create lookup maps
    const serviceMap = {};
    servicesResult.data.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    const kapperMap = {};
    kappersResult.data.forEach(kapper => {
      kapperMap[kapper.id] = kapper;
    });
    
    // Combine appointments with service and kapper data
    const appointmentsWithDetails = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 },
      kappers: kapperMap[appointment.kapper_id] || { naam: 'Onbekend' }
    }));
    
    // Group by kapper with detailed tracking
    const kapperStats = {};
    appointmentsWithDetails.forEach(appointment => {
      const kapperId = appointment.kapper_id;
      const kapperName = appointment.kappers?.naam || 'Onbekend';
      const price = appointment.diensten?.prijs_euro || 0;
      const serviceName = appointment.diensten?.naam || 'Onbekende Dienst';
      
      if (!kapperStats[kapperId]) {
        kapperStats[kapperId] = {
          id: kapperId,
          name: kapperName,
          revenue: 0,
          count: 0,
          services: {},
          appointments: []
        };
      }
      
      kapperStats[kapperId].revenue += price;
      kapperStats[kapperId].count += 1;
      kapperStats[kapperId].appointments.push({
        id: appointment.id,
        date: appointment.datumtijd,
        service: serviceName,
        price: price
      });
      
      // Track service breakdown per kapper
      if (!kapperStats[kapperId].services[serviceName]) {
        kapperStats[kapperId].services[serviceName] = { count: 0, revenue: 0 };
      }
      kapperStats[kapperId].services[serviceName].count += 1;
      kapperStats[kapperId].services[serviceName].revenue += price;
    });
    
    // Sort by revenue (highest first)
    const sortedKappers = Object.values(kapperStats).sort((a, b) => b.revenue - a.revenue);
    
    // Update UI with real-time data
    const container = document.getElementById('kapperRevenueGrid');
    if (container) {
      container.innerHTML = '';
      
      sortedKappers.forEach((kapper, index) => {
        const item = document.createElement('div');
        item.className = 'kapper-revenue-item';
        
        // Add ranking indicator
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        item.innerHTML = `
          <div class="kapper-revenue-info">
            <h4>${rankIcon} ${kapper.name}</h4>
            <p>Kapper • ${kapper.count} afspraken</p>
          </div>
          <div class="kapper-revenue-amount">
            <div class="amount">€${kapper.revenue.toFixed(2)}</div>
            <div class="count">${kapper.count} afspraken</div>
          </div>
        `;
        
        // Add click to see detailed breakdown
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => showKapperDetails(kapper));
        
        container.appendChild(item);
      });
      
      if (sortedKappers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen afspraken in deze periode</p>';
      }
    }
    
    // Store for comparison
    window.lastKapperStats = {
      kappers: sortedKappers,
      timestamp: new Date()
    };
    
    console.log('Kapper revenue stats loaded (real-time):', {
      totalKappers: sortedKappers.length,
      topKapper: sortedKappers[0]?.name,
      topRevenue: sortedKappers[0]?.revenue,
      kapperDetails: sortedKappers.map(b => ({
        name: b.name,
        revenue: b.revenue,
        count: b.count,
        services: Object.keys(b.services).length
      })),
      debug: {
        appointmentsCount: appointments.length,
        uniqueKapperIds: kapperIds,
        kapperMap: Object.keys(kapperMap),
        appointmentsWithDetails: appointmentsWithDetails.length
      }
    });
    
  } catch (error) {
    console.error('Error loading kapper revenue stats:', error);
    
    // Show error in UI
    const container = document.getElementById('kapperRevenueGrid');
    if (container) {
      container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">Fout bij laden van kapper statistieken</p>';
    }
  }
}

// Function to show detailed kapper breakdown
function showKapperDetails(kapper) {
  const modal = document.createElement('div');
  modal.className = 'popup-overlay';
  modal.innerHTML = `
    <div class="popup-content" style="max-width: 600px;">
      <div class="popup-header">
        <h3>📊 ${kapper.name} - Detail Rapport</h3>
        <button class="close-btn" onclick="this.closest('.popup-overlay').remove()">×</button>
      </div>
      <div class="popup-body">
        <div style="margin-bottom: 20px;">
          <h4>💰 Totaal: €${kapper.revenue.toFixed(2)}</h4>
          <p>${kapper.count} afspraken • Gemiddeld €${(kapper.revenue / kapper.count).toFixed(2)} per afspraak</p>
        </div>
        
        <h4>✂️ Diensten Breakdown:</h4>
        ${Object.entries(kapper.services).map(([service, stats]) => `
          <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--surface); margin: 5px 0; border-radius: 4px;">
            <span>${service}</span>
            <span>€${stats.revenue.toFixed(2)} (${stats.count}x)</span>
          </div>
        `).join('')}
        
        <h4 style="margin-top: 20px;">📅 Recente Afspraken:</h4>
        <div style="max-height: 200px; overflow-y: auto;">
          ${kapper.appointments.slice(0, 10).map(apt => `
            <div style="display: flex; justify-content: space-between; padding: 5px; font-size: 14px;">
              <span>${new Date(apt.date).toLocaleDateString('nl-NL')} - ${apt.service}</span>
              <span>€${apt.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function loadServiceStats(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('id, dienst_id, datumtijd')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString());
    
    if (error) throw error;
    
    // Get unique service IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    
    // Fetch services data
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, naam, prijs_euro, duur_minuten')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Combine appointments with service data
    const appointmentsWithServices = appointments.map(appointment => ({
      ...appointment,
      diensten: serviceMap[appointment.dienst_id] || { naam: 'Onbekende Dienst', prijs_euro: 0, duur_minuten: 0 }
    }));
    
    // Group by service
    const serviceStats = {};
    appointmentsWithServices.forEach(appointment => {
      const serviceId = appointment.dienst_id;
      const serviceName = appointment.diensten?.naam || 'Onbekende Dienst';
      const price = appointment.diensten?.prijs_euro || 0;
      
      if (!serviceStats[serviceId]) {
        serviceStats[serviceId] = {
          name: serviceName,
          revenue: 0,
          count: 0
        };
      }
      
      serviceStats[serviceId].revenue += price;
      serviceStats[serviceId].count += 1;
    });
    
    // Sort by count
    const sortedServices = Object.values(serviceStats).sort((a, b) => b.count - a.count);
    
    // Update UI
    const container = document.getElementById('servicesStatsGrid');
    if (container) {
      container.innerHTML = '';
      
      sortedServices.forEach(service => {
        const item = document.createElement('div');
        item.className = 'service-stats-item';
        item.innerHTML = `
          <div class="service-stats-info">
            <h4>${service.name}</h4>
            <p>Dienst</p>
          </div>
          <div class="service-stats-amount">
            <div class="amount">€${service.revenue.toFixed(2)}</div>
            <div class="count">${service.count} afspraken</div>
          </div>
        `;
        container.appendChild(item);
      });
      
      if (sortedServices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Geen data beschikbaar</p>';
      }
    }
    
    console.log('Service stats loaded:', sortedServices);
    
  } catch (error) {
    console.error('Error loading service stats:', error);
  }
}

async function loadCustomerInsights(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get all customers who made appointments in this period
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('email')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString());
    
    if (error) throw error;
    
    // Get unique customers
    const uniqueCustomers = [...new Set(appointments.map(a => a.email))];
    
    // Get customers who made appointments before this period (returning customers)
    const { data: previousAppointments, error: prevError } = await sb
      .from('boekingen')
      .select('email')
      .lt('datumtijd', startDate.toISOString());
    
    if (prevError) throw prevError;
    
    const previousCustomers = [...new Set(previousAppointments.map(a => a.email))];
    
    // Calculate returning customers in this period
    const returningCustomers = uniqueCustomers.filter(email => previousCustomers.includes(email));
    
    // Calculate new customers
    const newCustomers = uniqueCustomers.filter(email => !previousCustomers.includes(email));
    
    // Calculate average appointments per customer
    const avgAppointmentsPerCustomer = uniqueCustomers.length > 0 ? 
      appointments.length / uniqueCustomers.length : 0;
    
    // Update UI
    document.getElementById('newCustomers').textContent = newCustomers.length.toString();
    document.getElementById('returningCustomers').textContent = 
      uniqueCustomers.length > 0 ? 
      `${((returningCustomers.length / uniqueCustomers.length) * 100).toFixed(1)}%` : '0%';
    document.getElementById('avgAppointmentsPerCustomer').textContent = avgAppointmentsPerCustomer.toFixed(1);
    
    console.log('Customer insights loaded:', { 
      newCustomers: newCustomers.length, 
      returningCustomers: returningCustomers.length, 
      avgAppointmentsPerCustomer 
    });
    
  } catch (error) {
    console.error('Error loading customer insights:', error);
  }
}

async function loadWeeklyTrends(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Use the same date range as the main statistics
    const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Calculate previous period of same length
    const previousPeriodEnd = new Date(startDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    previousPeriodEnd.setHours(23, 59, 59, 999);
    
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodLength + 1);
    previousPeriodStart.setHours(0, 0, 0, 0);
    
    // Get this month's data for comparison
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonthEnd = new Date();
    thisMonthEnd.setMonth(thisMonthEnd.getMonth() + 1, 0);
    thisMonthEnd.setHours(23, 59, 59, 999);
    
    // Fetch data for all periods using the same date range as main stats
    const [currentPeriodData, previousPeriodData, thisMonthData] = await Promise.all([
      getRevenueForPeriod(sb, startDate, endDate),
      getRevenueForPeriod(sb, previousPeriodStart, previousPeriodEnd),
      getRevenueForPeriod(sb, thisMonthStart, thisMonthEnd)
    ]);
    
    // Calculate comparisons
    const currentPeriodComparison = previousPeriodData > 0 ? 
      `${(((currentPeriodData - previousPeriodData) / previousPeriodData) * 100).toFixed(1)}%` : '-';
    
    const thisMonthComparison = 'Deze maand';
    
    // Update UI
    document.getElementById('thisWeekRevenue').textContent = `€${currentPeriodData.toFixed(2)}`;
    document.getElementById('thisWeekComparison').textContent = 
      currentPeriodData > previousPeriodData ? `↗️ +${currentPeriodComparison}` : 
      currentPeriodData < previousPeriodData ? `↘️ ${currentPeriodComparison}` : `→ ${currentPeriodComparison}`;
    
    document.getElementById('lastWeekRevenue').textContent = `€${previousPeriodData.toFixed(2)}`;
    document.getElementById('lastWeekComparison').textContent = 'Vorige week';
    
    document.getElementById('thisMonthRevenue').textContent = `€${thisMonthData.toFixed(2)}`;
    document.getElementById('thisMonthComparison').textContent = thisMonthComparison;
    
    console.log('Weekly trends loaded:', { currentPeriodData, previousPeriodData, thisMonthData });
    
  } catch (error) {
    console.error('Error loading weekly trends:', error);
  }
}

async function loadDailyRevenueChart(startDate, endDate) {
  try {
    const sb = window.supabase;
    
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('datumtijd, dienst_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString())
      .order('datumtijd', { ascending: true });
    
    if (error) throw error;
    
    if (appointments.length === 0) {
      renderEmptyChart();
      return;
    }
    
    // Get unique service IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    
    // Fetch services data
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, prijs_euro')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Group appointments by date and calculate daily revenue
    const dailyRevenue = {};
    appointments.forEach(appointment => {
      const date = appointment.datumtijd.split('T')[0];
      const price = serviceMap[appointment.dienst_id]?.prijs_euro || 0;
      
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += price;
    });
    
    // Create chart data
    const sortedDates = Object.keys(dailyRevenue).sort();
    const revenueData = sortedDates.map(date => dailyRevenue[date]);
    
    renderDailyRevenueChart(sortedDates, revenueData);
    
    console.log('Daily revenue chart loaded:', { sortedDates, revenueData });
    
  } catch (error) {
    console.error('Error loading daily revenue chart:', error);
    renderEmptyChart();
  }
}

function renderDailyRevenueChart(dates, revenueData) {
  const ctx = document.getElementById('dailyRevenueChart');
  if (!ctx) return;
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded yet');
    renderEmptyChart();
    return;
  }
  
  // Destroy existing chart if it exists
  if (window.dailyRevenueChart && typeof window.dailyRevenueChart.destroy === 'function') {
    window.dailyRevenueChart.destroy();
  }
  
  window.dailyRevenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates.map(date => new Date(date).toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'short' 
      })),
      datasets: [{
        label: 'Omzet per Dag (€)',
        data: revenueData,
        backgroundColor: 'rgba(242, 139, 130, 0.8)',
        borderColor: 'rgba(242, 139, 130, 1)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Omzet: €${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '€' + value;
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45
          }
        }
      }
    }
  });
}

function renderEmptyChart() {
  const ctx = document.getElementById('dailyRevenueChart');
  if (!ctx) return;
  
  // Destroy existing chart if it exists and Chart.js is loaded
  if (window.dailyRevenueChart && typeof window.dailyRevenueChart.destroy === 'function') {
    window.dailyRevenueChart.destroy();
  }
  
  // Show message instead of chart
  ctx.style.display = 'none';
  const container = ctx.parentElement;
  container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Geen omzet data beschikbaar voor deze periode</p>';
}

async function getRevenueForPeriod(sb, startDate, endDate) {
  try {
    // Get appointments in date range
    const { data: appointments, error } = await sb
      .from('boekingen')
      .select('dienst_id')
      .gte('datumtijd', startDate.toISOString())
      .lte('datumtijd', endDate.toISOString());
    
    if (error) throw error;
    
    if (appointments.length === 0) return 0;
    
    // Get unique service IDs
    const serviceIds = [...new Set(appointments.map(apt => apt.dienst_id))];
    
    // Fetch services data
    const { data: services, error: servicesError } = await sb
      .from('diensten')
      .select('id, prijs_euro')
      .in('id', serviceIds);
    
    if (servicesError) throw servicesError;
    
    // Create service lookup map
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    // Calculate total revenue
    return appointments.reduce((sum, appointment) => {
      const service = serviceMap[appointment.dienst_id];
      return sum + (service?.prijs_euro || 0);
    }, 0);
    
  } catch (error) {
    console.error('Error getting revenue for period:', error);
    return 0;
  }
}

// ====================== Bookings List ======================
let currentBookingsPage = 1;
let bookingsPerPage = 20;
let allBookings = [];
let filteredBookings = [];
let bookingsUpdateInterval = null;

/**
 * Generate quarter-hour time slots (00:00, 00:15, 00:30, 00:45, etc.)
 */
function generateQuarterHourSlots() {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
}

/**
 * Generate time slots based on kapper availability for a specific date
 */
async function generateKapperAvailableSlots(kapperId, date, excludeAppointmentId = null) {
  try {
    const sb = window.supabase;
    
    // Get kapper availability for the day of week
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const { data: availability, error } = await sb
      .from('kapper_availability')
      .select('start_time, end_time')
      .eq('kapper_id', kapperId)
      .eq('day_of_week', dayName)
      .single();
    
    if (error || !availability) {
      // Kapper doesn't work on this day
      return [];
    }
    
    // Get existing bookings for this kapper on this date (excluding current appointment if editing)
    let bookedQuery = sb
      .from('boekingen')
      .select('datumtijd, begin_tijd, eind_tijd, dienst_id')
      .eq('kapper_id', kapperId)
      .eq('datumtijd', `${date}T00:00:00`);
    
    if (excludeAppointmentId) {
      bookedQuery = bookedQuery.neq('id', excludeAppointmentId);
    }
    
    const { data: existingBookings } = await bookedQuery;
    
    // Generate quarter-hour slots within working hours
    const slots = [];
    const startTime = availability.start_time;
    const endTime = availability.end_time;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    while (current < end) {
      const timeSlot = current.toTimeString().slice(0, 5);
      
      // Check if this time slot conflicts with existing bookings
      let isAvailable = true;
      
      if (existingBookings && existingBookings.length > 0) {
        for (const booking of existingBookings) {
          const bookingStart = booking.begin_tijd || booking.datumtijd.slice(11, 16);
          const bookingEnd = booking.eind_tijd || (() => {
            // Calculate end time based on service duration if eind_tijd is not set
            const startTime = new Date(`2000-01-01T${bookingStart}`);
            return new Date(startTime.getTime() + 30 * 60000).toTimeString().slice(0, 5); // Default 30 min
          })();
          
          // Check for time overlap
          if (timeSlot >= bookingStart && timeSlot < bookingEnd) {
            isAvailable = false;
            break;
          }
        }
      }
      
      if (isAvailable) {
        slots.push(timeSlot);
      }
      
      current.setMinutes(current.getMinutes() + 15);
    }
    
    return slots;
  } catch (error) {
    console.error('Error generating kapper available slots:', error);
    return [];
  }
}

async function loadBookingsList() {
  try {
    console.log('Loading bookings list...');
    
    const sb = window.supabase;
    
    // Get all bookings first
    const { data: bookings, error } = await sb
      .from('boekingen')
      .select('*')
      .order('datumtijd', { ascending: false });
    
    if (error) throw error;
    
    // Get unique service and kapper IDs
    const serviceIds = [...new Set(bookings.map(apt => apt.dienst_id))];
    const kapperIds = [...new Set(bookings.map(apt => apt.kapper_id))];
    
    // Fetch services and kappers data separately
    const [servicesResult, kappersResult] = await Promise.all([
      sb.from('diensten').select('id, naam, prijs_euro, duur_minuten').in('id', serviceIds),
      sb.from('kappers').select('id, naam').in('id', kapperIds)
    ]);
    
    if (servicesResult.error) throw servicesResult.error;
    if (kappersResult.error) throw kappersResult.error;
    
    // Create lookup maps
    const serviceMap = {};
    servicesResult.data.forEach(service => {
      serviceMap[service.id] = service;
    });
    
    const kapperMap = {};
    kappersResult.data.forEach(kapper => {
      kapperMap[kapper.id] = kapper;
    });
    
    // Combine bookings with service and kapper data
    const bookingsWithDetails = bookings.map(booking => ({
      ...booking,
      kappers: kapperMap[booking.kapper_id] || { id: booking.kapper_id, naam: 'Onbekend' },
      diensten: serviceMap[booking.dienst_id] || { id: booking.dienst_id, naam: 'Onbekend', prijs_euro: 0, duur_minuten: 0 }
    }));
    
    allBookings = bookingsWithDetails || [];
    filteredBookings = [...allBookings];
    
    // Load kappers for filter
    await loadKappersForFilter();
    
    // Apply current filters
    applyBookingsFilters();
    
    // Render bookings
    renderBookingsList();
    
    console.log(`Loaded ${allBookings.length} bookings`);
    
    // Start auto-update if bookings tab is active
    startBookingsAutoUpdate();
    
  } catch (error) {
    console.error('Error loading bookings list:', error);
    alert('Fout bij laden van boekingen: ' + error.message);
  }
}

function startBookingsAutoUpdate() {
  // Clear existing interval
  if (bookingsUpdateInterval) {
    clearInterval(bookingsUpdateInterval);
  }
  
  // Show indicator
  const indicator = document.getElementById('autoUpdateIndicator');
  if (indicator) {
    indicator.style.display = 'flex';
  }
  
  // Start new interval - update every 15 seconds
  bookingsUpdateInterval = setInterval(async () => {
    const bookingsTab = document.getElementById('boekingen');
    if (bookingsTab && bookingsTab.classList.contains('active')) {
      console.log('Auto-updating bookings list...');
      await loadBookingsList();
    }
  }, 15000); // 15 seconds
  
  console.log('Bookings auto-update started (every 15 seconds)');
}

function stopBookingsAutoUpdate() {
  if (bookingsUpdateInterval) {
    clearInterval(bookingsUpdateInterval);
    bookingsUpdateInterval = null;
    console.log('Bookings auto-update stopped');
  }
  
  // Hide indicator
  const indicator = document.getElementById('autoUpdateIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

async function loadKappersForFilter() {
  try {
    const sb = window.supabase;
    const { data: kappers, error } = await sb
      .from('kappers')
      .select('id, naam')
      .order('naam');
    
    if (error) throw error;
    
    const kapperFilter = document.getElementById('kapperFilter');
    if (kapperFilter) {
      kapperFilter.innerHTML = '<option value="all">Alle kappers</option>';
      kappers.forEach(kapper => {
        const option = document.createElement('option');
        option.value = kapper.id;
        option.textContent = kapper.naam;
        kapperFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading kappers for filter:', error);
  }
}

function applyBookingsFilters() {
  const dateRange = document.getElementById('dateRangeFilter')?.value || 'all';
  const kapperFilter = document.getElementById('kapperFilter')?.value || 'all';
  const sortOrder = document.getElementById('sortOrderFilter')?.value || 'newest';
  
  let filtered = [...allBookings];
  
  // Apply date range filter
  if (dateRange !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    filtered = filtered.filter(booking => {
      const bookingDate = new Date(booking.datumtijd);
      
      switch (dateRange) {
        case 'today':
          return bookingDate >= today && bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          return bookingDate >= monthStart && bookingDate < monthEnd;
        default:
          return true;
      }
    });
  }
  
  // Apply kapper filter
  if (kapperFilter !== 'all') {
    filtered = filtered.filter(booking => booking.kapper_id == kapperFilter);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.datumtijd);
    const dateB = new Date(b.datumtijd);
    
    switch (sortOrder) {
      case 'newest':
        return dateB - dateA;
      case 'oldest':
        return dateA - dateB;
      case 'date-asc':
        return dateA - dateB;
      case 'date-desc':
        return dateB - dateA;
      default:
        return dateB - dateA;
    }
  });
  
  filteredBookings = filtered;
  currentBookingsPage = 1;
}

function renderBookingsList() {
  const bookingsList = document.getElementById('bookingsList');
  if (!bookingsList) return;
  
  const startIndex = (currentBookingsPage - 1) * bookingsPerPage;
  const endIndex = startIndex + bookingsPerPage;
  const pageBookings = filteredBookings.slice(startIndex, endIndex);
  
  if (pageBookings.length === 0) {
    bookingsList.innerHTML = `
      <div class="booking-row">
        <div class="booking-cell" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
          Geen afspraken gevonden voor de geselecteerde filters
        </div>
      </div>
    `;
  } else {
    bookingsList.innerHTML = pageBookings.map(booking => {
      const date = new Date(booking.datumtijd);
      const dateStr = date.toLocaleDateString('nl-NL');
      const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="booking-row" data-booking-id="${booking.id}">
          <div class="booking-cell date-cell">
            <div class="booking-date">${dateStr}</div>
            <div class="booking-time">${timeStr}</div>
          </div>
          <div class="booking-cell customer-cell">
            <div class="booking-customer">${booking.klantnaam || 'Onbekend'}</div>
            <div class="booking-email">${booking.email || ''}</div>
          </div>
          <div class="booking-cell">
            <div class="booking-kapper">${booking.kappers?.naam || 'Onbekend'}</div>
          </div>
          <div class="booking-cell">
            <div class="booking-service">${booking.diensten?.naam || 'Onbekend'}</div>
          </div>
          <div class="booking-cell">
            <div class="booking-price">€${booking.diensten?.prijs_euro || 0}</div>
          </div>
          <div class="booking-cell">
            <div class="booking-status confirmed">Bevestigd</div>
          </div>
          <div class="booking-cell">
            <div class="booking-actions">
              <button class="btn btn-sm btn-primary" onclick="editBookingInline(${booking.id})">Bewerken</button>
              <span class="delete-emoji" onclick="deleteBookingFromList(${booking.id})">🗑️</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Update pagination
  updateBookingsPagination();
}

function updateBookingsPagination() {
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
  if (pageInfo) {
    pageInfo.textContent = `Pagina ${currentBookingsPage} van ${totalPages}`;
  }
  
  if (prevBtn) {
    prevBtn.disabled = currentBookingsPage <= 1;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentBookingsPage >= totalPages;
  }
}

async function editBookingInline(bookingId) {
  // Check if another booking is already being edited
  const existingEditRow = document.querySelector('.booking-row.edit-mode');
  if (existingEditRow) {
    // Cancel the existing edit
    const existingBookingId = existingEditRow.dataset.bookingId;
    if (existingBookingId && existingBookingId != bookingId) {
      cancelBookingEdit(existingBookingId);
    }
  }
  
  // Find the booking row
  const bookingRow = document.querySelector(`[data-booking-id="${bookingId}"]`);
  if (!bookingRow) {
    console.error('Booking row not found for ID:', bookingId);
    return;
  }
  
  // Check if already in edit mode
  if (bookingRow.classList.contains('edit-mode')) {
    return;
  }
  
  // Find the booking data
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) {
    console.error('Booking data not found for ID:', bookingId);
    return;
  }
  
  // Stop auto-update during editing
  stopBookingsAutoUpdate();
  
  // Update indicator to show editing mode
  const indicator = document.getElementById('autoUpdateIndicator');
  if (indicator) {
    indicator.innerHTML = '<span class="update-dot" style="background: #F28B82;"></span><span>Bewerken actief - auto-update uitgeschakeld</span>';
    indicator.style.display = 'flex';
  }
  
  // Add edit mode class
  bookingRow.classList.add('edit-mode');
  
  // Store original content
  bookingRow.dataset.originalContent = bookingRow.innerHTML;
  
  // Create edit form
  const date = new Date(booking.datumtijd);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().substring(0, 5);
  
  // Generate time options based on kapper availability
  const timeSlots = await generateKapperAvailableSlots(booking.kapper_id, dateStr, bookingId);
  const timeOptions = timeSlots.length > 0 ? 
    timeSlots.map(time => 
      `<option value="${time}" ${time === timeStr ? 'selected' : ''}>${time}</option>`
    ).join('') :
    `<option value="" disabled>Geen tijden beschikbaar voor deze dag</option>`;

  bookingRow.innerHTML = `
    <div class="booking-cell date-cell">
      <input type="date" class="edit-input" value="${dateStr}" style="width: 100%; margin-bottom: 4px;">
      <select class="edit-input" style="width: 100%;" id="editTime${bookingId}">
        ${timeOptions}
      </select>
    </div>
    <div class="booking-cell customer-cell">
      <input type="text" class="edit-input" value="${booking.klantnaam || ''}" style="width: 100%; margin-bottom: 4px;" placeholder="Klantnaam">
      <input type="email" class="edit-input" value="${booking.email || ''}" style="width: 100%;" placeholder="Email">
    </div>
    <div class="booking-cell">
      <select class="edit-input" style="width: 100%;" id="editKapper${bookingId}">
        <!-- Will be populated -->
      </select>
    </div>
    <div class="booking-cell">
      <select class="edit-input" style="width: 100%;" id="editService${bookingId}">
        <!-- Will be populated -->
      </select>
    </div>
    <div class="booking-cell">
      <span id="editPrice${bookingId}">€0</span>
    </div>
    <div class="booking-cell">
      <div class="booking-status confirmed">Bevestigd</div>
    </div>
    <div class="booking-cell">
      <div class="booking-actions">
        <button class="btn btn-sm btn-success save-btn" onclick="saveBookingInline(${bookingId})">Opslaan</button>
        <button class="btn btn-sm btn-secondary" onclick="cancelBookingEdit(${bookingId})">Annuleren</button>
      </div>
    </div>
  `;
  
  // Load kappers and services for dropdowns
  loadEditDropdowns(bookingId, booking);
  
  // Add event listeners for dynamic time slot updates
  (async () => {
    await setupEditFormEventListeners(bookingId);
  })();
}

async function setupEditFormEventListeners(bookingId) {
  const dateInput = document.querySelector(`[data-booking-id="${bookingId}"] input[type="date"]`);
  const kapperSelect = document.getElementById(`editKapper${bookingId}`);
  const timeSelect = document.getElementById(`editTime${bookingId}`);
  
  if (dateInput && kapperSelect && timeSelect) {
    const updateTimeSlots = async () => {
      const selectedDate = dateInput.value;
      const selectedKapper = kapperSelect.value;
      
      if (selectedDate && selectedKapper) {
        timeSelect.innerHTML = '<option value="">Laden...</option>';
        timeSelect.disabled = true;
        
        try {
          const timeSlots = await generateKapperAvailableSlots(selectedKapper, selectedDate);
          const currentTime = timeSelect.dataset.currentTime || '';
          
          timeSelect.innerHTML = '';
          if (timeSlots.length > 0) {
            timeSlots.forEach(time => {
              const option = document.createElement('option');
              option.value = time;
              option.textContent = time;
              option.selected = time === currentTime;
              timeSelect.appendChild(option);
            });
          } else {
            timeSelect.innerHTML = '<option value="" disabled>Geen tijden beschikbaar voor deze dag</option>';
          }
        } catch (error) {
          console.error('Error updating time slots:', error);
          timeSelect.innerHTML = '<option value="" disabled>Fout bij laden tijden</option>';
        } finally {
          timeSelect.disabled = false;
        }
      }
    };
    
    dateInput.addEventListener('change', updateTimeSlots);
    kapperSelect.addEventListener('change', updateTimeSlots);
  }
}

async function loadEditDropdowns(bookingId, booking) {
  try {
    const sb = window.supabase;
    
    // Get kappers and services
    const [kappersResult, servicesResult] = await Promise.all([
      sb.from('kappers').select('id, naam').order('naam'),
      sb.from('diensten').select('id, naam, prijs_euro').order('naam')
    ]);
    
    if (kappersResult.error) throw kappersResult.error;
    if (servicesResult.error) throw servicesResult.error;
    
    // Populate kapper dropdown
    const kapperSelect = document.getElementById(`editKapper${bookingId}`);
    if (kapperSelect) {
      kapperSelect.innerHTML = '';
      kappersResult.data.forEach(kapper => {
        const option = document.createElement('option');
        option.value = kapper.id;
        option.textContent = kapper.naam;
        option.selected = kapper.id === booking.kapper_id;
        kapperSelect.appendChild(option);
      });
    }
    
    // Populate service dropdown
    const serviceSelect = document.getElementById(`editService${bookingId}`);
    const priceSpan = document.getElementById(`editPrice${bookingId}`);
    if (serviceSelect) {
      serviceSelect.innerHTML = '';
      servicesResult.data.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.naam;
        option.selected = service.id === booking.dienst_id;
        option.dataset.price = service.prijs_euro;
        serviceSelect.appendChild(option);
      });
      
      // Set initial price
      const selectedService = servicesResult.data.find(s => s.id === booking.dienst_id);
      if (selectedService && priceSpan) {
        priceSpan.textContent = `€${selectedService.prijs_euro}`;
      }
      
      // Add change listener to update price
      serviceSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        if (selectedOption && priceSpan) {
          priceSpan.textContent = `€${selectedOption.dataset.price}`;
        }
      });
    }
    
  } catch (error) {
    console.error('Error loading edit dropdowns:', error);
  }
}

async function saveBookingInline(bookingId) {
  try {
    const bookingRow = document.querySelector(`[data-booking-id="${bookingId}"]`);
    if (!bookingRow) return;
    
    // Get form values
    const dateInput = bookingRow.querySelector('input[type="date"]');
    const timeSelect = document.getElementById(`editTime${bookingId}`);
    const nameInput = bookingRow.querySelector('input[type="text"]');
    const emailInput = bookingRow.querySelector('input[type="email"]');
    const kapperSelect = document.getElementById(`editKapper${bookingId}`);
    const serviceSelect = bookingRow.querySelectorAll('select')[1];
    
    const date = dateInput.value;
    const time = timeSelect.value;
    const klantnaam = nameInput.value;
    const email = emailInput.value;
    const kapperId = kapperSelect.value;
    const serviceId = serviceSelect.value;
    
    // Validation
    if (!date || !time || !klantnaam || !email || !kapperId || !serviceId) {
      alert('Vul alle velden in!');
      return;
    }
    
    const sb = window.supabase;
    const newDateTime = `${date}T${time}:00`;
    
    // Update the booking
    const { error } = await sb
      .from('boekingen')
      .update({
        klantnaam: klantnaam,
        email: email,
        datumtijd: newDateTime,
        kapper_id: parseInt(kapperId),
        dienst_id: parseInt(serviceId)
      })
      .eq('id', bookingId);
    
    if (error) throw error;
    
    // Reload the bookings list
    await loadBookingsList();
    
    // Also refresh statistics
    if (typeof loadStatistics === 'function') {
      await loadStatistics();
    }
    
    // Restart auto-update after saving
    const bookingsTab = document.getElementById('boekingen');
    if (bookingsTab && bookingsTab.classList.contains('active')) {
      startBookingsAutoUpdate();
    }
    
    // Reset indicator
    const indicator = document.getElementById('autoUpdateIndicator');
    if (indicator) {
      indicator.innerHTML = '<span class="update-dot"></span><span>Auto-update actief</span>';
    }
    
    alert('Afspraak succesvol bijgewerkt!');
    
  } catch (error) {
    console.error('Error updating booking:', error);
    alert('Fout bij bijwerken van afspraak: ' + error.message);
  }
}

function cancelBookingEdit(bookingId) {
  const bookingRow = document.querySelector(`[data-booking-id="${bookingId}"]`);
  if (!bookingRow) return;
  
  // Restore original content
  if (bookingRow.dataset.originalContent) {
    bookingRow.innerHTML = bookingRow.dataset.originalContent;
  }
  
  // Remove edit mode
  bookingRow.classList.remove('edit-mode');
  delete bookingRow.dataset.originalContent;
  
  // Restart auto-update after canceling
  const bookingsTab = document.getElementById('boekingen');
  if (bookingsTab && bookingsTab.classList.contains('active')) {
    startBookingsAutoUpdate();
  }
  
  // Reset indicator
  const indicator = document.getElementById('autoUpdateIndicator');
  if (indicator) {
    indicator.innerHTML = '<span class="update-dot"></span><span>Auto-update actief</span>';
  }
}

function editBookingFromList(bookingId) {
  // Find the booking in the agenda tab and edit it
  const agendaTab = document.getElementById('agenda');
  if (agendaTab) {
    // Switch to agenda tab
    document.querySelector('[data-tab="agenda"]').click();
    
    // Find and click the appointment block
    setTimeout(() => {
      const appointmentBlock = document.querySelector(`[data-appointment-id="${bookingId}"]`);
      if (appointmentBlock) {
        appointmentBlock.click();
      }
    }, 100);
  }
}

async function deleteBookingFromList(bookingId) {
  const confirmed = await customConfirm('Weet je zeker dat je deze afspraak wilt verwijderen?', 'Afspraak Verwijderen');
  if (!confirmed) {
    return;
  }
  
  try {
    const sb = window.supabase;
    const { error } = await sb
      .from('boekingen')
      .delete()
      .eq('id', bookingId);
    
    if (error) throw error;
    
    // Reload the list
    await loadBookingsList();
    
    // Also refresh statistics
    if (typeof loadStatistics === 'function') {
      await loadStatistics();
    }
    
    alert('Afspraak succesvol verwijderd!');
    
  } catch (error) {
    console.error('Error deleting booking:', error);
    alert('Fout bij verwijderen van afspraak: ' + error.message);
  }
}

// Initialize bookings list functionality
function initBookingsList() {
  // Filter change listeners
  const dateRangeFilter = document.getElementById('dateRangeFilter');
  const kapperFilter = document.getElementById('kapperFilter');
  const sortOrderFilter = document.getElementById('sortOrderFilter');
  const refreshBtn = document.getElementById('refreshBookingsBtn');
  
  if (dateRangeFilter) {
    dateRangeFilter.addEventListener('change', () => {
      applyBookingsFilters();
      renderBookingsList();
    });
  }
  
  if (kapperFilter) {
    kapperFilter.addEventListener('change', () => {
      applyBookingsFilters();
      renderBookingsList();
    });
  }
  
  if (sortOrderFilter) {
    sortOrderFilter.addEventListener('change', () => {
      applyBookingsFilters();
      renderBookingsList();
    });
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadBookingsList();
    });
  }
  
  // Pagination listeners
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentBookingsPage > 1) {
        currentBookingsPage--;
        renderBookingsList();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
      if (currentBookingsPage < totalPages) {
        currentBookingsPage++;
        renderBookingsList();
      }
    });
  }
}

// ====================== Customer Import ======================
function initializeCustomerImport() {
  console.log('Initializing customer import functionality...');
  
  // Add event listeners
  const selectCsvFileBtn = document.getElementById('selectCsvFile');
  const csvFileInput = document.getElementById('csvFileInput');
  const confirmImportBtn = document.getElementById('confirmImport');
  const cancelImportBtn = document.getElementById('cancelImport');
  const importTestCustomersBtn = document.getElementById('importTestCustomers');
  
  if (selectCsvFileBtn && csvFileInput) {
    selectCsvFileBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleCsvFileSelect);
  }
  
  if (confirmImportBtn) {
    confirmImportBtn.addEventListener('click', confirmImport);
  }
  
  if (cancelImportBtn) {
    cancelImportBtn.addEventListener('click', cancelImport);
  }
  
  if (importTestCustomersBtn) {
    importTestCustomersBtn.addEventListener('click', importTestCustomers);
  }
}

function handleCsvFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  console.log('CSV file selected:', file.name);
  
  // Show selected file name
  const fileNameSpan = document.getElementById('selectedFileName');
  if (fileNameSpan) {
    fileNameSpan.textContent = file.name;
  }
  
  // Read and parse CSV
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csvData = parseCSV(e.target.result);
      showImportPreview(csvData);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Fout bij het lezen van het CSV bestand: ' + error.message);
    }
  };
  
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV bestand is leeg');
  }
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('CSV headers:', headers);
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  console.log('Parsed CSV data:', { headers, rowCount: rows.length });
  
  return { headers, rows };
}

function showImportPreview(csvData) {
  const previewDiv = document.getElementById('importPreview');
  const previewTableHead = document.getElementById('previewTableHead');
  const previewTableBody = document.getElementById('previewTableBody');
  const mappingControls = document.getElementById('mappingControls');
  
  if (!previewDiv || !previewTableHead || !previewTableBody || !mappingControls) {
    console.error('Import preview elements not found');
    return;
  }
  
  // Show preview section
  previewDiv.style.display = 'block';
  
  // Create table header
  previewTableHead.innerHTML = '';
  const headerRow = document.createElement('tr');
  csvData.headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  previewTableHead.appendChild(headerRow);
  
  // Create table body (show first 10 rows)
  previewTableBody.innerHTML = '';
  csvData.rows.slice(0, 10).forEach(row => {
    const tr = document.createElement('tr');
    csvData.headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = row[header] || '';
      tr.appendChild(td);
    });
    previewTableBody.appendChild(tr);
  });
  
  // Create mapping controls
  createMappingControls(csvData.headers, mappingControls);
  
  // Update import count
  const importCountSpan = document.getElementById('importCount');
  if (importCountSpan) {
    importCountSpan.textContent = csvData.rows.length;
  }
  
  // Enable confirm button
  const confirmBtn = document.getElementById('confirmImport');
  if (confirmBtn) {
    confirmBtn.disabled = false;
  }
  
  console.log('Import preview shown for', csvData.rows.length, 'customers');
}

function createMappingControls(headers, container) {
  container.innerHTML = '';
  
  // Define required fields
  const requiredFields = [
    { key: 'naam', label: 'Naam', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'telefoon', label: 'Telefoon', required: false }
  ];
  
  requiredFields.forEach(field => {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'mapping-control';
    
    const label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    label.style.color = field.required ? 'var(--accent)' : 'var(--text-secondary)';
    
    const select = document.createElement('select');
    select.id = `mapping_${field.key}`;
    select.required = field.required;
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Selecteer kolom --';
    select.appendChild(emptyOption);
    
    // Add CSV headers as options
    headers.forEach(header => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      
      // Auto-select if header matches field key
      if (header.toLowerCase().includes(field.key.toLowerCase())) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });
    
    controlDiv.appendChild(label);
    controlDiv.appendChild(select);
    container.appendChild(controlDiv);
  });
}

async function confirmImport() {
  const mappingControls = document.getElementById('mappingControls');
  if (!mappingControls) return;
  
  // Get mapping configuration
  const mappings = {};
  const requiredFields = ['naam', 'email', 'telefoon'];
  
  requiredFields.forEach(field => {
    const select = document.getElementById(`mapping_${field}`);
    if (select) {
      mappings[field] = select.value;
    }
  });
  
  // Validate mappings
  if (!mappings.naam || !mappings.email) {
    alert('Naam en Email zijn verplichte velden');
    return;
  }
  
  // Get CSV data from preview
  const csvFileInput = document.getElementById('csvFileInput');
  if (!csvFileInput.files[0]) return;
  
  // Hide preview, show progress
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importProgress').style.display = 'block';
  
  try {
    // Re-parse CSV with mapping
    const csvText = await readFileAsText(csvFileInput.files[0]);
    const csvData = parseCSV(csvText);
    
    // Map and validate data
    const customers = [];
    const errors = [];
    
    csvData.rows.forEach((row, index) => {
      const customer = {
        naam: row[mappings.naam]?.trim(),
        email: row[mappings.email]?.trim(),
        telefoon: mappings.telefoon ? row[mappings.telefoon]?.trim() : null
      };
      
      // Validate required fields
      if (!customer.naam) {
        errors.push(`Rij ${index + 2}: Naam ontbreekt`);
        return;
      }
      
      if (!customer.email) {
        errors.push(`Rij ${index + 2}: Email ontbreekt`);
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        errors.push(`Rij ${index + 2}: Ongeldig email formaat`);
        return;
      }
      
      customers.push(customer);
    });
    
    // Show errors if any
    if (errors.length > 0) {
      showImportResults(false, 0, customers.length, errors);
      return;
    }
    
    // Import customers to database
    await importCustomersToDatabase(customers);
    
  } catch (error) {
    console.error('Import error:', error);
    showImportResults(false, 0, 0, [error.message]);
  }
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file, 'UTF-8');
  });
}

async function importCustomersToDatabase(customers) {
  const sb = window.supabase;
  let successCount = 0;
  const errors = [];
  
  const totalCustomers = customers.length;
  
  for (let i = 0; i < customers.length; i++) {
    try {
      // Update progress
      updateImportProgress(i + 1, totalCustomers);
      
      // Check if customer already exists
      const { data: existingCustomer } = await sb
        .from('customers')
        .select('id')
        .eq('email', customers[i].email)
        .single();
      
      if (existingCustomer) {
        errors.push(`${customers[i].naam}: Email bestaat al`);
        continue;
      }
      
      // Insert new customer
      const { error } = await sb
        .from('customers')
        .insert({
          naam: customers[i].naam,
          email: customers[i].email,
          telefoon: customers[i].telefoon || null,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        errors.push(`${customers[i].naam}: ${error.message}`);
      } else {
        successCount++;
      }
      
    } catch (error) {
      errors.push(`${customers[i].naam}: ${error.message}`);
    }
  }
  
  // Show results
  showImportResults(true, successCount, totalCustomers, errors);
  
  // Refresh customer list
  if (successCount > 0) {
    await loadCustomers();
  }
}

function updateImportProgress(current, total) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
  }
  
  if (progressText) {
    progressText.textContent = `${current} van ${total} klanten geïmporteerd`;
  }
}

function showImportResults(success, successCount, totalCount, errors) {
  // Hide progress
  document.getElementById('importProgress').style.display = 'none';
  
  // Show results
  const resultsDiv = document.getElementById('importResults');
  const summaryDiv = document.getElementById('resultsSummary');
  const detailsDiv = document.getElementById('resultsDetails');
  
  if (!resultsDiv || !summaryDiv || !detailsDiv) return;
  
  resultsDiv.style.display = 'block';
  
  // Update summary
  if (success && successCount > 0) {
    summaryDiv.className = 'results-summary success';
    summaryDiv.innerHTML = `
      <h5>✅ Import Succesvol!</h5>
      <p>${successCount} van ${totalCount} klanten succesvol geïmporteerd</p>
    `;
  } else {
    summaryDiv.className = 'results-summary error';
    summaryDiv.innerHTML = `
      <h5>❌ Import Problemen</h5>
      <p>${successCount} van ${totalCount} klanten geïmporteerd</p>
    `;
  }
  
  // Update details
  if (errors.length > 0) {
    detailsDiv.innerHTML = `
      <h6>Fouten:</h6>
      <ul>
        ${errors.map(error => `<li>${error}</li>`).join('')}
      </ul>
    `;
  } else {
    detailsDiv.innerHTML = '<p>Alle klanten succesvol geïmporteerd!</p>';
  }
  
  console.log('Import results:', { success, successCount, totalCount, errors });
}

function cancelImport() {
  // Reset form
  document.getElementById('csvFileInput').value = '';
  document.getElementById('selectedFileName').textContent = '';
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importProgress').style.display = 'none';
  document.getElementById('importResults').style.display = 'none';
  document.getElementById('confirmImport').disabled = true;
}

// ====================== Test Data Generator ======================
function generateTestCustomers() {
  console.log('Generating 25 test customers...');
  
  const firstNames = [
    'Jan', 'Piet', 'Klaas', 'Henk', 'Willem', 'Dirk', 'Gerard', 'Frank', 'Rob', 'Tom',
    'Maria', 'Anna', 'Els', 'Sandra', 'Linda', 'Petra', 'Monique', 'Ingrid', 'Marieke', 'Femke',
    'Ahmed', 'Mohamed', 'Hassan', 'Yusuf', 'Ibrahim', 'Fatima', 'Aisha', 'Zainab', 'Layla', 'Nour'
  ];
  
  const lastNames = [
    'Janssen', 'de Vries', 'Bakker', 'Visser', 'Smit', 'de Jong', 'Mulder', 'de Groot', 'Bos', 'Dijkstra',
    'Vermeulen', 'van Dijk', 'van der Berg', 'van den Berg', 'van der Meer', 'van der Wal', 'van der Laan',
    'van der Velde', 'van der Linden', 'van der Pol', 'van der Ven', 'van der Heijden', 'van der Beek',
    'van der Kooij', 'van der Steen', 'van der Zee', 'van der Werf', 'van der Werff', 'van der Woude',
    'Al-Hassan', 'Al-Zahra', 'Al-Rashid', 'Al-Mahmoud', 'Al-Nasser', 'Al-Khalil', 'Al-Farouk'
  ];
  
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.nl', 'ziggo.nl', 'kpn.nl', 'outlook.com', 'live.nl'];
  
  const customers = [];
  
  for (let i = 0; i < 25; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    // Generate phone number (Dutch format)
    const phonePrefixes = ['06', '061', '062', '063', '064', '065', '066', '067', '068', '069'];
    const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
    const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 7);
    const phone = prefix + phoneSuffix;
    
    // Generate email
    const emailPrefix = firstName.toLowerCase() + '.' + lastName.toLowerCase().replace(/\s+/g, '');
    const email = `${emailPrefix}@${domain}`;
    
    customers.push({
      naam: `${firstName} ${lastName}`,
      email: email,
      telefoon: phone
    });
  }
  
  console.log('Generated test customers:', customers);
  return customers;
}

async function importTestCustomers() {
  try {
    console.log('Starting import of 25 test customers...');
    
    // Show progress immediately
    document.getElementById('importProgress').style.display = 'block';
    
    const customers = generateTestCustomers();
    
    // Import directly to database
    await importCustomersToDatabase(customers);
    
    console.log('Test customers import completed!');
    
  } catch (error) {
    console.error('Error importing test customers:', error);
    
    // Hide progress and show error
    document.getElementById('importProgress').style.display = 'none';
    showImportResults(false, 0, 0, [error.message]);
  }
}

// Custom confirmation for kapper deletion
function showKapperDeleteConfirmation(kapperName) {
  return new Promise((resolve) => {
    // Prevent multiple confirmations
    const existing = document.getElementById('kapperDeleteConfirmationPopup');
    if (existing) {
      resolve(false);
      return;
    }
    
    const message = `Weet je zeker dat je kapper "${kapperName}" wilt verwijderen?\n\n⚠️ WAARSCHUWING: Dit zal ook verwijderen:\n• Alle werktijden van deze kapper\n• Alle afspraken van deze kapper\n\nDeze actie kan niet ongedaan worden gemaakt!`;
    
    // Create custom confirmation dialog
    const confirmationHtml = `
        <div id="kapperDeleteConfirmationPopup" class="popup" style="display: flex;">
            <div class="popup-content">
                <h3>Bevestig Verwijdering</h3>
                <p style="white-space: pre-line; margin: 20px 0;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelKapperDeleteBtn" class="btn btn-secondary">Annuleren</button>
                    <button id="confirmKapperDeleteBtn" class="btn btn-danger">Ja, Verwijder</button>
                </div>
            </div>
        </div>
    `;
    
    // Add confirmation to body
    document.body.insertAdjacentHTML('beforeend', confirmationHtml);
    
    // Add event listeners
    document.getElementById('cancelKapperDeleteBtn').addEventListener('click', () => {
      document.getElementById('kapperDeleteConfirmationPopup').remove();
      resolve(false);
    });
    
    document.getElementById('confirmKapperDeleteBtn').addEventListener('click', () => {
      document.getElementById('kapperDeleteConfirmationPopup').remove();
      resolve(true);
    });
  });
}

// Custom confirmation for dienst deletion
function showDienstDeleteConfirmation(dienstName) {
  return new Promise((resolve) => {
    // Prevent multiple confirmations
    const existing = document.getElementById('dienstDeleteConfirmationPopup');
    if (existing) {
      resolve(false);
      return;
    }
    
    const message = `Weet je zeker dat je dienst "${dienstName}" wilt verwijderen?\n\nAlle afspraken voor deze dienst worden ook verwijderd!\n\nDeze actie kan niet ongedaan worden gemaakt.`;
    
    // Create custom confirmation dialog
    const confirmationHtml = `
        <div id="dienstDeleteConfirmationPopup" class="popup" style="display: flex;">
            <div class="popup-content">
                <h3>Bevestig Verwijdering</h3>
                <p style="white-space: pre-line; margin: 20px 0;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelDienstDeleteBtn" class="btn btn-secondary">Annuleren</button>
                    <button id="confirmDienstDeleteBtn" class="btn btn-danger">Ja, Verwijder</button>
                </div>
            </div>
        </div>
    `;
    
    // Add confirmation to body
    document.body.insertAdjacentHTML('beforeend', confirmationHtml);
    
    // Add event listeners
    document.getElementById('cancelDienstDeleteBtn').addEventListener('click', () => {
      document.getElementById('dienstDeleteConfirmationPopup').remove();
      resolve(false);
    });
    
    document.getElementById('confirmDienstDeleteBtn').addEventListener('click', () => {
      document.getElementById('dienstDeleteConfirmationPopup').remove();
      resolve(true);
    });
  });
}
