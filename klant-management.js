// klant-management.js
let supabase;
let allCustomers = [];
let filteredCustomers = [];

// Wait for Supabase client to be available
async function waitForSupabase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.supabaseClient) {
            console.log('Supabase client found');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Supabase client not found after maximum attempts');
}

// Initialize Supabase client
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase client to be available
    await waitForSupabase();
    
    if (!window.supabaseClient) {
        console.error("Supabase client ontbreekt");
        return;
    }
    
    supabase = window.supabaseClient;

    // Initialize theme
    initializeTheme();

    // Load customers
    await loadCustomers();

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', debounce(searchCustomers, 300));
    document.getElementById('searchBtn').addEventListener('click', searchCustomers);
    
    // Filter and sort
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    document.getElementById('filterBy').addEventListener('change', applyFilters);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('customerModal').addEventListener('click', (e) => {
        if (e.target.id === 'customerModal') closeModal();
    });
    
    // Edit modal close
    document.querySelector('.close-edit').addEventListener('click', closeEditModal);
    document.getElementById('editCustomerModal').addEventListener('click', (e) => {
        if (e.target.id === 'editCustomerModal') closeEditModal();
    });
    
    // Edit form handlers
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('editCustomerForm').addEventListener('submit', updateCustomer);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

async function loadCustomers() {
    try {
        console.log('Loading customers...');
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('naam');
        
        if (error) throw error;
        
        allCustomers = data || [];
        filteredCustomers = [...allCustomers];
        
        console.log('Loaded customers:', allCustomers.length);
        renderCustomers();
    } catch (error) {
        console.error('Error loading customers:', error);
        document.getElementById('customerList').innerHTML = 
            '<div class="error">Fout bij laden van klanten. Probeer het opnieuw.</div>';
    }
}

function renderCustomers() {
    const container = document.getElementById('customerList');
    
    if (filteredCustomers.length === 0) {
        container.innerHTML = '<div class="no-results">Geen klanten gevonden.</div>';
        return;
    }
    
    const html = filteredCustomers.map(customer => `
        <div class="customer-card" onclick="showCustomerDetails(${customer.id})">
            <div class="customer-header">
                <h3>${customer.naam}</h3>
                <div class="customer-badges">
                    ${customer.loyaliteitspunten > 0 ? `<span class="badge loyalty">⭐ ${customer.loyaliteitspunten} punten</span>` : ''}
                    ${customer.aantal_afspraken > 5 ? `<span class="badge frequent">🔥 Frequente klant</span>` : ''}
                    ${isRecentCustomer(customer) ? `<span class="badge recent">🆕 Recent</span>` : ''}
                </div>
            </div>
            <div class="customer-info">
                <p><strong>Email:</strong> ${customer.email}</p>
                <p><strong>Telefoon:</strong> ${customer.telefoon || 'Niet opgegeven'}</p>
                <p><strong>Afspraken:</strong> ${customer.aantal_afspraken}</p>
                <p><strong>Uitgegeven:</strong> €${customer.totaal_uitgegeven.toFixed(2)}</p>
                <p><strong>Laatste afspraak:</strong> ${formatDate(customer.laatste_afspraak)}</p>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function searchCustomers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        filteredCustomers = [...allCustomers];
    } else {
        filteredCustomers = allCustomers.filter(customer => 
            customer.naam.toLowerCase().includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            (customer.telefoon && customer.telefoon.includes(searchTerm))
        );
    }
    
    applyFilters();
}

function applyFilters() {
    const sortBy = document.getElementById('sortBy').value;
    const filterBy = document.getElementById('filterBy').value;
    
    let filtered = [...filteredCustomers];
    
    // Apply filters
    switch (filterBy) {
        case 'loyal':
            filtered = filtered.filter(c => c.loyaliteitspunten >= 10);
            break;
        case 'recent':
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            filtered = filtered.filter(c => new Date(c.laatste_afspraak) >= thirtyDaysAgo);
            break;
        case 'frequent':
            filtered = filtered.filter(c => c.aantal_afspraken >= 5);
            break;
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'naam':
                return a.naam.localeCompare(b.naam);
            case 'laatste_afspraak':
                return new Date(b.laatste_afspraak) - new Date(a.laatste_afspraak);
            case 'aantal_afspraken':
                return b.aantal_afspraken - a.aantal_afspraken;
            case 'loyaliteitspunten':
                return b.loyaliteitspunten - a.loyaliteitspunten;
            default:
                return 0;
        }
    });
    
    filteredCustomers = filtered;
    renderCustomers();
}

async function showCustomerDetails(customerId) {
    try {
        // Load customer details
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
        
        if (customerError) throw customerError;
        
        // Load customer appointments
        const { data: appointments, error: appointmentsError } = await supabase
            .from('boekingen')
            .select('*')
            .eq('email', customer.email)
            .order('datumtijd', { ascending: false });
        
        if (appointmentsError) throw appointmentsError;
        
        // Load barber and service data for appointments
        const enrichedAppointments = await Promise.all(
            (appointments || []).map(async (apt) => {
                const [barberData, serviceData] = await Promise.all([
                    getBarberData(apt.barber_id),
                    getServiceData(apt.dienst_id)
                ]);
                
                return {
                    ...apt,
                    barber: barberData,
                    dienst: serviceData
                };
            })
        );
        
        // Load customer notes
        const { data: notes, error: notesError } = await supabase
            .from('customer_notes')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        
        if (notesError) throw notesError;
        
        // Render customer details
        renderCustomerModal(customer, enrichedAppointments, notes || []);
        document.getElementById('customerModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading customer details:', error);
        alert('Fout bij laden van klantgegevens');
    }
}

function renderCustomerModal(customer, appointments, notes) {
    const modal = document.getElementById('customerDetails');
    
    modal.innerHTML = `
        <div class="customer-detail-header">
            <h2>${customer.naam}</h2>
            <button onclick="openEditModal(${customer.id})" class="btn btn-edit" style="margin-bottom: 20px;">✏️ Bewerken</button>
            <div class="customer-stats">
                <div class="stat">
                    <span class="stat-value">${customer.aantal_afspraken}</span>
                    <span class="stat-label">Afspraken</span>
                </div>
                <div class="stat">
                    <span class="stat-value">€${customer.totaal_uitgegeven.toFixed(2)}</span>
                    <span class="stat-label">Uitgegeven</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${customer.loyaliteitspunten}</span>
                    <span class="stat-label">Loyaliteitspunten</span>
                </div>
            </div>
        </div>
        
        <div class="customer-detail-content">
            <div class="detail-section">
                <h3>Contactgegevens</h3>
                <p><strong>Email:</strong> ${customer.email}</p>
                <p><strong>Telefoon:</strong> ${customer.telefoon || 'Niet opgegeven'}</p>
                ${customer.geboortedatum ? `<p><strong>Geboortedatum:</strong> ${formatDate(customer.geboortedatum)}</p>` : ''}
                ${customer.adres ? `<p><strong>Adres:</strong> ${customer.adres}, ${customer.postcode} ${customer.plaats}</p>` : ''}
            </div>
            
            <div class="detail-section">
                <h3>Afspraakgeschiedenis</h3>
                <div class="appointments-list">
                    ${appointments.length === 0 ? '<p>Geen afspraken gevonden.</p>' : 
                        appointments.map(apt => `
                            <div class="appointment-item">
                                <div class="appointment-date">${formatDateTime(apt.datumtijd)}</div>
                                <div class="appointment-details">
                                    <div class="appointment-service">${apt.dienst?.naam || 'Onbekend'}</div>
                                    <div class="appointment-barber">${apt.barber?.naam || 'Onbekend'}</div>
                                    <div class="appointment-price">€${apt.dienst?.prijs_euro || '0'}</div>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Notities</h3>
                <div class="notes-section">
                    <div class="add-note">
                        <textarea id="newNote" placeholder="Voeg een notitie toe..."></textarea>
                        <button onclick="addNote(${customer.id})" class="btn">Notitie toevoegen</button>
                    </div>
                    <div class="notes-list">
                        ${notes.length === 0 ? '<p>Geen notities.</p>' : 
                            notes.map(note => `
                                <div class="note-item">
                                    <div class="note-content">${note.note}</div>
                                    <div class="note-meta">
                                        <span class="note-author">${note.created_by}</span>
                                        <span class="note-date">${formatDateTime(note.created_at)}</span>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function addNote(customerId) {
    const noteText = document.getElementById('newNote').value.trim();
    if (!noteText) return;
    
    try {
        const { error } = await supabase
            .from('customer_notes')
            .insert([{
                customer_id: customerId,
                note: noteText,
                created_by: 'admin'
            }]);
        
        if (error) throw error;
        
        // Refresh customer details
        showCustomerDetails(customerId);
        document.getElementById('newNote').value = '';
        
    } catch (error) {
        console.error('Error adding note:', error);
        alert('Fout bij toevoegen van notitie');
    }
}

function closeModal() {
    document.getElementById('customerModal').style.display = 'none';
}

async function logout() {
    try {
        await supabase.auth.signOut();
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'admin-login.html';
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'Niet bekend';
    return new Date(dateString).toLocaleDateString('nl-NL');
}

function formatDateTime(dateString) {
    if (!dateString) return 'Niet bekend';
    return new Date(dateString).toLocaleString('nl-NL');
}

function isRecentCustomer(customer) {
    if (!customer.laatste_afspraak) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(customer.laatste_afspraak) >= thirtyDaysAgo;
}

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

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Helper functions for loading related data
async function getBarberData(barberId) {
  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('naam')
      .eq('id', barberId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading barber data:', error);
    return { naam: 'Onbekend' };
  }
}

async function getServiceData(serviceId) {
  try {
    const { data, error } = await supabase
      .from('diensten')
      .select('naam, prijs_euro')
      .eq('id', serviceId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading service data:', error);
    return { naam: 'Onbekend', prijs_euro: 0 };
  }
}

// ====================== Customer Edit Functions ======================
let currentEditingCustomer = null;

function openEditModal(customerId) {
  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) return;
  
  currentEditingCustomer = customer;
  
  // Populate form with customer data
  document.getElementById('editNaam').value = customer.naam || '';
  document.getElementById('editEmail').value = customer.email || '';
  document.getElementById('editTelefoon').value = customer.telefoon || '';
  document.getElementById('editGeboortedatum').value = customer.geboortedatum || '';
  document.getElementById('editAdres').value = customer.adres || '';
  document.getElementById('editPostcode').value = customer.postcode || '';
  document.getElementById('editPlaats').value = customer.plaats || '';
  document.getElementById('editNotities').value = customer.notities || '';
  document.getElementById('editVoorkeuren').value = customer.voorkeuren ? JSON.stringify(customer.voorkeuren, null, 2) : '';
  
  // Show edit modal
  document.getElementById('editCustomerModal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('editCustomerModal').style.display = 'none';
  currentEditingCustomer = null;
  
  // Reset form
  document.getElementById('editCustomerForm').reset();
}

async function updateCustomer(e) {
  e.preventDefault();
  
  if (!currentEditingCustomer) return;
  
  try {
    // Get form data
    const formData = new FormData(e.target);
    const updateData = {
      naam: formData.get('naam'),
      email: formData.get('email'),
      telefoon: formData.get('telefoon') || null,
      geboortedatum: formData.get('geboortedatum') || null,
      adres: formData.get('adres') || null,
      postcode: formData.get('postcode') || null,
      plaats: formData.get('plaats') || null,
      notities: formData.get('notities') || null,
      voorkeuren: formData.get('voorkeuren') ? JSON.parse(formData.get('voorkeuren')) : {},
      updated_at: new Date().toISOString()
    };
    
    // Update customer in database
    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', currentEditingCustomer.id);
    
    if (error) throw error;
    
    // Update local data
    const customerIndex = allCustomers.findIndex(c => c.id === currentEditingCustomer.id);
    if (customerIndex !== -1) {
      allCustomers[customerIndex] = { ...allCustomers[customerIndex], ...updateData };
    }
    
    // Refresh customer list
    applyFilters();
    
    // Close modal
    closeEditModal();
    
    // Show success message
    alert('Klantgegevens succesvol bijgewerkt!');
    
  } catch (error) {
    console.error('Error updating customer:', error);
    alert('Fout bij bijwerken van klantgegevens: ' + error.message);
  }
}
