<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  let updateAvailable = false;
  let registration: ServiceWorkerRegistration | null = null;
  let newWorker: ServiceWorker | null = null;
  
  onMount(() => {
    if (!('serviceWorker' in navigator)) return;
    
    // Check for updates periodically
    const checkInterval = setInterval(checkForUpdates, 60000); // every minute
    
    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;
      
      // Check if there's already a waiting worker
      if (reg.waiting) {
        newWorker = reg.waiting;
        updateAvailable = true;
      }
      
      // Listen for new service worker
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            newWorker = installing;
            updateAvailable = true;
          }
        });
      });
    });
    
    // Reload page when new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    
    return () => {
      clearInterval(checkInterval);
    };
  });
  
  async function checkForUpdates() {
    if (registration) {
      try {
        await registration.update();
      } catch (e) {
        console.log('Update check failed:', e);
      }
    }
  }
  
  function doUpdate() {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }
  
  function dismissUpdate() {
    updateAvailable = false;
  }
</script>

{#if updateAvailable}
  <div class="update-banner">
    <span>🔄 Nová verzia je dostupná!</span>
    <div class="actions">
      <button class="update-btn" on:click={doUpdate}>Aktualizovať</button>
      <button class="dismiss-btn" on:click={dismissUpdate}>Neskôr</button>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 15px 25px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  .actions {
    display: flex;
    gap: 10px;
  }
  
  .update-btn {
    background: white;
    color: #1d4ed8;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .update-btn:hover {
    background: #f0f0f0;
  }
  
  .dismiss-btn {
    background: transparent;
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }
  
  .dismiss-btn:hover {
    background: rgba(255,255,255,0.1);
  }
  
  @media (max-width: 500px) {
    .update-banner {
      flex-direction: column;
      left: 10px;
      right: 10px;
      transform: none;
      width: auto;
    }
  }
</style>
