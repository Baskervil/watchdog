<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Project } from '$lib/db';
  import { subscribeToPush, getPushPermission } from '$lib/push';
  import { checkProject, formatUptime, formatResponseTime } from '$lib/monitor';
  import { getDeviceName, regenerateDeviceName } from '$lib/device-name';
  import UpdateBanner from '$lib/UpdateBanner.svelte';
  
  let projects: Project[] = [];
  let editingProject: Project | null = null;
  let showAddModal = false;
  
  // Form fields
  let name = '';
  let url = '';
  let healthEndpoint = '';
  let checkInterval = 5;
  
  // Push state
  let pushEnabled = false;
  let pushPermission: NotificationPermission = 'default';
  let pushSupported = false;
  let deviceName = '';
  let isStandalone = false;
  let isIOS = false;
  
  // Monitoring
  let checkingId: string | null = null;
  let checkInterval_: number | null = null;
  
  onMount(async () => {
    deviceName = getDeviceName();
    await loadProjects();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        console.log('SW registration failed:', e);
      }
    }
    
    isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    
    pushSupported = 'PushManager' in window && 'Notification' in window;
    
    if (pushSupported) {
      pushPermission = await getPushPermission();
      pushEnabled = pushPermission === 'granted';
    }
    
    // Auto-refresh projects from server every 10 seconds
    checkInterval_ = setInterval(loadProjects, 10000) as unknown as number;
  });
  
  onDestroy(() => {
    if (checkInterval_) clearInterval(checkInterval_);
  });
  
  async function loadProjects() {
    const res = await fetch('/api/projects');
    projects = await res.json();
  }
  
  async function saveProject(project: Partial<Project>): Promise<Project> {
    if (project.id && projects.find(p => p.id === project.id)) {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      return res.json();
    } else {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      return res.json();
    }
  }
  
  async function deleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  }
  
  async function runChecks() {
    for (const project of projects) {
      if (checkingId) continue;
      
      const now = Date.now();
      const lastCheck = project.lastCheck || 0;
      const interval = project.checkInterval * 60 * 1000;
      
      if (now - lastCheck >= interval) {
        await checkSingleProject(project);
      }
    }
  }
  
  async function checkSingleProject(project: Project) {
    checkingId = project.id;
    
    const result = await checkProject(project);
    const statusChanged = project.status !== result.status && project.status !== 'unknown';
    
    await saveProject({
      ...project,
      status: result.status,
      responseTime: result.responseTime,
      lastCheck: Date.now(),
      lastStatusChange: statusChanged ? Date.now() : project.lastStatusChange
    });
    
    checkingId = null;
    await loadProjects();
  }
  
  function openAddModal(project?: Project) {
    if (project) {
      editingProject = project;
      name = project.name;
      url = project.url;
      healthEndpoint = project.healthEndpoint || '';
      checkInterval = project.checkInterval;
    } else {
      editingProject = null;
      name = '';
      url = '';
      healthEndpoint = '';
      checkInterval = 5;
    }
    showAddModal = true;
  }
  
  function closeModal() {
    showAddModal = false;
    editingProject = null;
  }
  
  async function handleSave() {
    if (!name.trim() || !url.trim()) return;
    
    await saveProject({
      id: editingProject?.id,
      name: name.trim(),
      url: url.trim(),
      healthEndpoint: healthEndpoint.trim() || undefined,
      checkInterval,
      status: editingProject?.status || 'unknown',
      createdAt: editingProject?.createdAt
    });
    
    closeModal();
    await loadProjects();
    
    // Immediately check new project
    const newProject = projects.find(p => p.name === name.trim());
    if (newProject) {
      await checkSingleProject(newProject);
    }
  }
  
  async function handleDelete(id: string) {
    if (confirm('Naozaj odstrániť tento projekt?')) {
      await deleteProject(id);
      await loadProjects();
    }
  }
  
  async function enablePush() {
    const permission = await Notification.requestPermission();
    pushPermission = permission;
    
    if (permission === 'granted') {
      const subscription = await subscribeToPush(true);
      pushEnabled = !!subscription;
    }
  }
  
  function handleRegenerateName() {
    deviceName = regenerateDeviceName();
    if (pushEnabled) {
      subscribeToPush(true);
    }
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'up': return '#22c55e';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  }
  
  function getStatusEmoji(status: string): string {
    switch (status) {
      case 'up': return '🟢';
      case 'down': return '🔴';
      default: return '⚪';
    }
  }
</script>

<svelte:head>
  <title>Watchdog - Monitoring</title>
</svelte:head>

<UpdateBanner />

<main>
  <header>
    <h1><img src="/icon-192.png" alt="Watchdog" class="logo" /> Watchdog</h1>
    <p class="subtitle">Monitoring projektov</p>
  </header>
  
  <section class="status-bar">
    <div class="stats">
      <span class="stat up">🟢 {projects.filter(p => p.status === 'up').length}</span>
      <span class="stat down">🔴 {projects.filter(p => p.status === 'down').length}</span>
      <span class="stat unknown">⚪ {projects.filter(p => p.status === 'unknown').length}</span>
    </div>
    <button class="add-btn" on:click={() => openAddModal()}>+ Pridať</button>
  </section>
  
  <section class="projects">
    {#if projects.length === 0}
      <div class="empty">
        <p>Žiadne projekty</p>
        <p class="hint">Pridaj prvý projekt na monitorovanie</p>
      </div>
    {:else}
      {#each projects as project (project.id)}
        <div class="project-card" class:checking={checkingId === project.id}>
          <div class="project-header">
            <span class="status-dot" style="background: {getStatusColor(project.status)}"></span>
            <h3>{project.name}</h3>
            <span class="response-time">{formatResponseTime(project.responseTime)}</span>
          </div>
          
          <div class="project-url">{project.url}</div>
          
          <div class="project-meta">
            <span>Uptime: {formatUptime(project.lastStatusChange)}</span>
            <span>Interval: {project.checkInterval}m</span>
          </div>
          
          <div class="project-actions">
            <button on:click={() => checkSingleProject(project)} disabled={checkingId === project.id}>
              {checkingId === project.id ? '⏳' : '🔄'} Check
            </button>
            <button on:click={() => openAddModal(project)}>✏️ Upraviť</button>
            <button class="danger" on:click={() => handleDelete(project.id)}>🗑️</button>
          </div>
        </div>
      {/each}
    {/if}
  </section>
  
  <section class="push-section">
    <h2>🔔 Push notifikácie</h2>
    
    {#if isIOS && !isStandalone}
      <div class="ios-hint">
        <p>Pre push notifikácie na iOS:</p>
        <ol>
          <li>Klikni na <strong>Zdieľať</strong> (📤)</li>
          <li>Vyber <strong>Pridať na plochu</strong></li>
          <li>Otvor appku z plochy</li>
        </ol>
      </div>
    {:else if !pushSupported}
      <p class="warning">Push notifikácie nie sú podporované v tomto prehliadači.</p>
    {:else if pushEnabled}
      <div class="push-enabled">
        <p>✅ Notifikácie sú zapnuté</p>
        <div class="device-name">
          <span>Zariadenie: <strong>{deviceName}</strong></span>
          <button on:click={handleRegenerateName}>🔄</button>
        </div>
      </div>
    {:else}
      <button class="enable-push" on:click={enablePush}>
        Zapnúť notifikácie
      </button>
    {/if}
  </section>
</main>

{#if showAddModal}
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal" on:click|stopPropagation>
      <h2>{editingProject ? 'Upraviť projekt' : 'Nový projekt'}</h2>
      
      <label>
        Názov
        <input type="text" bind:value={name} placeholder="Môj projekt" />
      </label>
      
      <label>
        URL
        <input type="url" bind:value={url} placeholder="https://example.com" />
      </label>
      
      <label>
        Health endpoint (voliteľné)
        <input type="url" bind:value={healthEndpoint} placeholder="https://example.com/health" />
      </label>
      
      <label>
        Interval kontroly (minúty)
        <input type="number" bind:value={checkInterval} min="1" max="60" />
      </label>
      
      <div class="modal-actions">
        <button on:click={closeModal}>Zrušiť</button>
        <button class="primary" on:click={handleSave}>Uložiť</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f23;
    color: #e0e0e0;
    min-height: 100vh;
  }
  
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  header {
    text-align: center;
    margin-bottom: 30px;
  }
  
  h1 {
    margin: 0;
    font-size: 2rem;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  
  .logo {
    width: 48px;
    height: 48px;
    border-radius: 8px;
  }
  
  .subtitle {
    color: #888;
    margin: 5px 0 0;
  }
  
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #1a1a2e;
    border-radius: 12px;
  }
  
  .stats {
    display: flex;
    gap: 20px;
  }
  
  .stat {
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .add-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .projects {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .empty {
    text-align: center;
    padding: 40px;
    color: #666;
  }
  
  .hint {
    font-size: 0.9rem;
  }
  
  .project-card {
    background: #1a1a2e;
    border-radius: 12px;
    padding: 20px;
    transition: transform 0.2s;
  }
  
  .project-card.checking {
    opacity: 0.7;
  }
  
  .project-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .project-header h3 {
    margin: 0;
    flex: 1;
    font-size: 1.2rem;
  }
  
  .response-time {
    color: #888;
    font-size: 0.9rem;
  }
  
  .project-url {
    color: #666;
    font-size: 0.85rem;
    margin-bottom: 10px;
    word-break: break-all;
  }
  
  .project-meta {
    display: flex;
    gap: 20px;
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 15px;
  }
  
  .project-actions {
    display: flex;
    gap: 10px;
  }
  
  .project-actions button {
    background: #2a2a4a;
    border: none;
    color: #fff;
    padding: 8px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .project-actions button:hover {
    background: #3a3a5a;
  }
  
  .project-actions button.danger:hover {
    background: #ef4444;
  }
  
  .push-section {
    margin-top: 40px;
    padding: 20px;
    background: #1a1a2e;
    border-radius: 12px;
  }
  
  .push-section h2 {
    margin: 0 0 15px;
    font-size: 1.2rem;
  }
  
  .ios-hint {
    background: #2a2a4a;
    padding: 15px;
    border-radius: 8px;
  }
  
  .ios-hint ol {
    margin: 10px 0 0;
    padding-left: 20px;
  }
  
  .warning {
    color: #f59e0b;
  }
  
  .push-enabled {
    color: #22c55e;
  }
  
  .device-name {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    color: #888;
  }
  
  .device-name button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .enable-push {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  
  .modal {
    background: #1a1a2e;
    padding: 30px;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
  }
  
  .modal h2 {
    margin: 0 0 20px;
  }
  
  .modal label {
    display: block;
    margin-bottom: 15px;
    font-size: 0.9rem;
    color: #888;
  }
  
  .modal input {
    width: 100%;
    margin-top: 5px;
    padding: 12px;
    border: 1px solid #333;
    border-radius: 8px;
    background: #0f0f23;
    color: #fff;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
  
  .modal-actions button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    background: #2a2a4a;
    color: #fff;
  }
  
  .modal-actions button.primary {
    background: #3b82f6;
  }
</style>
