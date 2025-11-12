// Telegram WebApp initialization
const tg = window.Telegram?.WebApp;

if (!tg) {
    alert('❌ Telegram WebApp not available. Please open this page through Telegram.');
    throw new Error('Telegram WebApp not available');
}

tg.expand();
tg.ready();

// Apply Telegram theme
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5');

// State
let currentUser = null;
let campaigns = [];
let isAdmin = false;
let currentView = 'user'; // 'user' or 'admin'

// API helper
async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': tg.initData
    };

    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
}

// Initialize app
async function init() {
    try {
        console.log('Initializing app...');

        // Get current user
        const userData = await api('/me');
        currentUser = userData;
        isAdmin = userData.isAdmin;

        console.log('User data:', userData);

        // Load data
        await loadCampaigns();

        // Show appropriate screen (no loading screen to hide)
        if (isAdmin) {
            showAdminView();
        } else {
            showUserView();
        }

        // Setup event listeners
        setupEventListeners();

        console.log('App initialized successfully!');

    } catch (error) {
        console.error('Initialization error:', error);
        tg.showAlert(`Failed to initialize: ${error.message}`);
    }
}

// Show user view
function showUserView() {
    document.getElementById('admin-screen').classList.remove('active');
    document.getElementById('user-screen').classList.add('active');
    currentView = 'user';

    // Update user header
    const firstName = currentUser.user.first_name || 'User';
    const username = currentUser.user.username || '';
    const initial = firstName.charAt(0).toUpperCase();

    document.getElementById('user-initial').textContent = initial;
    document.getElementById('user-display-name').textContent = firstName;
    document.getElementById('user-display-username').textContent = username ? `@${username}` : '';

    // Update points and stats
    document.getElementById('user-points').textContent = currentUser.profile?.points || 0;
    document.getElementById('referral-count').textContent = currentUser.profile?.referralCount || 0;

    // Load user data
    loadUserTasks();
    loadUserReferralLink();
    loadLeaderboard();
}

// Show admin view
function showAdminView() {
    document.getElementById('user-screen').classList.remove('active');
    document.getElementById('admin-screen').classList.add('active');
    currentView = 'admin';

    renderAdminCampaigns();
    populateAdminCampaignSelects();
}

// Load campaigns
async function loadCampaigns() {
    try {
        const result = await api('/campaigns');
        campaigns = result.campaigns;
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

// Load user tasks (campaigns they can join)
async function loadUserTasks() {
    const tasksList = document.getElementById('tasks-list');

    if (campaigns.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <p>No tasks available yet</p>
                <small>Check back later for new tasks!</small>
            </div>
        `;
        return;
    }

    // Count completed tasks
    let completedCount = 0;

    tasksList.innerHTML = campaigns.map(campaign => {
        // Check if user has already joined this campaign
        const hasJoined = false; // TODO: Check from API
        if (hasJoined) completedCount++;

        return `
            <div class="task-card" onclick="openTask(${campaign.id})">
                <div class="task-icon">💰</div>
                <div class="task-info">
                    <div class="task-title">${escapeHtml(campaign.name)}</div>
                    <div class="task-description">Join ${escapeHtml(campaign.exchange)} and earn points</div>
                    <div class="task-reward">
                        <span>⭐</span>
                        <span>+${campaign.points_per_referral || 10} points per referral</span>
                    </div>
                </div>
                ${hasJoined ? '<div class="task-status completed">✓ Joined</div>' : '<div class="task-status pending">Join</div>'}
            </div>
        `;
    }).join('');

    document.getElementById('tasks-completed').textContent = completedCount;
}

// Open task modal
async function openTask(campaignId) {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    document.getElementById('task-modal-title').textContent = campaign.name;
    document.getElementById('task-modal-body').innerHTML = `
        <div style="margin-bottom: 16px;">
            <strong>Exchange:</strong> ${escapeHtml(campaign.exchange)}<br>
            <strong>Reward:</strong> ${campaign.points_per_referral || 10} points per referral
        </div>
        <div style="background: #f0f0f0; padding: 12px; border-radius: 8px; font-size: 13px;">
            <strong>How to earn:</strong><br>
            1. Click "Get Link" to get your referral link<br>
            2. Share the link with friends<br>
            3. Earn ${campaign.points_per_referral || 10} points for each friend who signs up!
        </div>
    `;

    const actionBtn = document.getElementById('task-action-btn');
    actionBtn.onclick = async () => {
        await joinCampaignAndGetLink(campaignId);
    };

    openModal('task-modal');
}

// Join campaign and get referral link
async function joinCampaignAndGetLink(campaignId) {
    try {
        tg.MainButton.showProgress();

        // Join campaign
        await api(`/campaigns/${campaignId}/join`, { method: 'POST' });

        // Generate user's referral link
        const link = await api(`/campaigns/${campaignId}/links`, {
            method: 'POST',
            body: JSON.stringify({
                channel: `user_${currentUser.user.id}`,
                inline_label: 'Join Exchange'
            })
        });

        // Show success
        closeModal('task-modal');

        document.getElementById('task-modal-body').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                <h3 style="margin-bottom: 8px;">Task Joined!</h3>
                <p style="color: #666; margin-bottom: 16px;">Your referral link:</p>
                <div class="referral-link-box">
                    <input type="text" value="${link.shortUrl}" readonly id="task-link-result">
                    <button class="btn-copy" onclick="copyTaskLink()">📋</button>
                </div>
            </div>
        `;
        openModal('task-modal');

        // Reload tasks
        await loadUserTasks();
        await loadUserLinks();

    } catch (error) {
        console.error('Error joining campaign:', error);
        tg.showAlert('Failed to join campaign: ' + error.message);
    } finally {
        tg.MainButton.hideProgress();
    }
}

// Copy task link
function copyTaskLink() {
    const input = document.getElementById('task-link-result');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        tg.showAlert('Link copied!');
    });
}

// Load user's referral link for the bot
function loadUserReferralLink() {
    const botUsername = 'AiExchangeBot_bot';
    const userId = currentUser.user.id;
    const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;

    document.getElementById('referral-link').value = referralLink;
}

// Copy referral link
function copyReferralLink() {
    const input = document.getElementById('referral-link');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        tg.showAlert('Referral link copied!');
    });
}

// Share referral link
function shareReferralLink() {
    const link = document.getElementById('referral-link').value;
    const text = `Join me on this awesome exchange rewards platform! Earn points for completing tasks and referring friends.\n\n${link}`;

    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
}

// Load user's campaign links
async function loadUserLinks() {
    try {
        const result = await api('/user/links');
        const links = result.links;

        const listEl = document.getElementById('user-links-list');

        if (links.length === 0) {
            listEl.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #999;">
                    <p>No referral links yet</p>
                    <small>Join tasks to get your referral links!</small>
                </div>
            `;
            return;
        }

        listEl.innerHTML = links.map(link => {
            const campaign = campaigns.find(c => c.id === link.campaign_id);
            return `
                <div class="list-item" style="margin: 0 16px 12px 16px;">
                    <div class="list-item-header">
                        <div>
                            <div class="list-item-title">${escapeHtml(campaign?.name || 'Campaign')}</div>
                            <div class="list-item-subtitle">${link.code}</div>
                        </div>
                    </div>
                    <div class="list-item-meta">
                        <span>👆 ${link.click_count || 0} clicks</span>
                    </div>
                    <div class="copy-field" style="margin-top: 8px;">
                        <input type="text" value="${window.location.origin}/r/${link.code}" readonly style="font-size: 12px;">
                        <button class="btn-copy" onclick="copyLink('${link.code}')">📋</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading user links:', error);
    }
}

// Copy link
function copyLink(code) {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url).then(() => {
        tg.showAlert('Link copied!');
    });
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const result = await api('/leaderboard/global?limit=20');
        const leaderboard = result.leaderboard;

        const listEl = document.getElementById('leaderboard-list');

        if (leaderboard.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏆</div>
                    <p>No rankings yet</p>
                    <small>Be the first to earn points!</small>
                </div>
            `;
            return;
        }

        // Find current user rank
        const userRank = leaderboard.findIndex(u => u.tg_user_id === currentUser.user.id.toString()) + 1;
        if (userRank > 0) {
            document.getElementById('user-rank').textContent = `#${userRank}`;
        }

        listEl.innerHTML = leaderboard.map((user, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'top1';
            else if (rank === 2) rankClass = 'top2';
            else if (rank === 3) rankClass = 'top3';

            const name = user.first_name || user.username || 'User';
            const username = user.username ? `@${user.username}` : '';

            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${rank}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${escapeHtml(name)}</div>
                        ${username ? `<div class="leaderboard-username">${escapeHtml(username)}</div>` : ''}
                    </div>
                    <div class="leaderboard-points">${user.points}</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// === ADMIN FUNCTIONS ===

// Render admin campaigns
function renderAdminCampaigns() {
    const list = document.getElementById('admin-campaigns-list');

    if (campaigns.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No campaigns yet</p>
                <small>Create your first campaign to get started</small>
            </div>
        `;
        return;
    }

    list.innerHTML = campaigns.map(campaign => `
        <div class="list-item">
            <div class="list-item-header">
                <div>
                    <div class="list-item-title">${escapeHtml(campaign.name)}</div>
                    <div class="list-item-subtitle">${escapeHtml(campaign.exchange)}</div>
                </div>
            </div>
            <div class="list-item-meta">
                <span>⭐ ${campaign.points_per_referral || 10} pts/referral</span>
                <span>📅 ${formatDate(campaign.created_at)}</span>
            </div>
        </div>
    `).join('');
}

// Populate admin campaign selects
function populateAdminCampaignSelects() {
    const selects = ['admin-campaign-select', 'admin-stats-campaign-select'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Campaign...</option>' +
            campaigns.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    });
}

// Create admin campaign
async function createCampaign() {
    const name = document.getElementById('campaign-name').value;
    const exchange = document.getElementById('campaign-exchange').value;
    const raw_url = document.getElementById('campaign-url').value;
    const points_per_referral = parseInt(document.getElementById('campaign-points').value) || 10;

    if (!name || !exchange || !raw_url) {
        tg.showAlert('Please fill in all required fields');
        return;
    }

    try {
        tg.MainButton.showProgress();

        await api('/campaigns', {
            method: 'POST',
            body: JSON.stringify({
                name,
                exchange,
                raw_url,
                utm_source: 'telegram',
                utm_medium: 'webapp',
                points_per_referral
            })
        });

        closeModal('new-campaign-modal');
        await loadCampaigns();
        renderAdminCampaigns();
        populateAdminCampaignSelects();
        tg.showAlert('Campaign created successfully!');

    } catch (error) {
        console.error('Error creating campaign:', error);
        tg.showAlert('Failed to create campaign: ' + error.message);
    } finally {
        tg.MainButton.hideProgress();
    }
}

// Admin generate link
async function adminGenerateLink() {
    const campaignId = parseInt(document.getElementById('admin-campaign-select').value);
    const channel = document.getElementById('admin-link-channel').value;

    if (!campaignId || !channel) {
        tg.showAlert('Please select campaign and enter channel');
        return;
    }

    try {
        tg.MainButton.showProgress();

        const link = await api(`/campaigns/${campaignId}/links`, {
            method: 'POST',
            body: JSON.stringify({
                channel,
                inline_label: 'Open Exchange'
            })
        });

        closeModal('generate-link-modal');
        tg.showAlert('Link generated: ' + link.shortUrl);

    } catch (error) {
        console.error('Error generating link:', error);
        tg.showAlert('Failed to generate link: ' + error.message);
    } finally {
        tg.MainButton.hideProgress();
    }
}

// Setup event listeners
function setupEventListeners() {
    // User tabs
    document.querySelectorAll('#user-screen .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchUserTab(tabName);
        });
    });

    // Admin tabs
    document.querySelectorAll('#admin-screen .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchAdminTab(tabName);
        });
    });

    // Admin buttons
    if (isAdmin) {
        document.getElementById('new-campaign-btn').addEventListener('click', () => {
            openModal('new-campaign-modal');
        });

        document.getElementById('admin-campaign-select').addEventListener('click', (e) => {
            document.getElementById('admin-generate-link-btn').disabled = !e.target.value;
        });

        document.getElementById('admin-generate-link-btn').addEventListener('click', () => {
            openModal('generate-link-modal');
        });
    }
}

// Switch user tab
function switchUserTab(tabName) {
    document.querySelectorAll('#user-screen .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#user-screen .tab-content').forEach(t => t.classList.remove('active'));

    document.querySelector(`#user-screen [data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data for tab
    if (tabName === 'referral') {
        loadUserLinks();
    } else if (tabName === 'leaderboard') {
        loadLeaderboard();
    }
}

// Switch admin tab
function switchAdminTab(tabName) {
    document.querySelectorAll('#admin-screen .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#admin-screen .tab-content').forEach(t => t.classList.remove('active'));

    document.querySelector(`#admin-screen [data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Modal helpers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Initialize on load
init();
