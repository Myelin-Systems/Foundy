<!-- =============================================================================
     lib/cms/components/SocialView.svelte
     ============================================================================= -->
<script lang="ts">
  import Icon            from './Icon.svelte';
  import StatusBadge     from './StatusBadge.svelte';
  import type { SocialPost } from '../types';

  const {
    siteId,
    posts,
  }: {
    siteId: string | null;
    posts:  SocialPost[];
  } = $props();

  const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn'] as const;
</script>

<div class="social cms-fade-in">
  <div class="social__header">
    <div>
      <h1 class="social__title">Social Posts</h1>
      <p class="social__subtitle">Schedule and publish to all your platforms at once</p>
    </div>
    <button class="social__new-btn"><Icon name="plus" size={15} /> New post</button>
  </div>

  <div class="social__platforms" role="list" aria-label="Connected platforms">
    {#each PLATFORMS as platform}
      <div class="social__platform-chip" role="listitem">
        <span class="social__platform-dot" aria-hidden="true"></span>
        <span class="social__platform-name">{platform}</span>
      </div>
    {/each}
    <button class="social__platform-add">
      <Icon name="plus" size={13} /> Connect platform
    </button>
  </div>

  {#if posts.length === 0}
    <div class="social__empty">
      <p class="social__empty-title">No posts yet</p>
      <p class="social__empty-sub">Create your first scheduled post</p>
    </div>
  {:else}
    <ul class="social__posts" aria-label="Scheduled posts">
      {#each posts as post (post.id)}
        <li class="social__post">
          <div class="social__post-thumb" aria-hidden="true">
            {#if post.hasImage}<Icon name="media" size={20} />{/if}
          </div>
          <div class="social__post-body">
            <p class="social__post-caption">{post.caption}</p>
            <div class="social__post-meta">
              {#each post.platforms as p}
                <span class="social__post-platform">{p}</span>
              {/each}
              <span class="social__post-divider" aria-hidden="true"></span>
              <span class="social__post-time">{post.scheduled}</span>
            </div>
          </div>
          <div class="social__post-actions">
            <StatusBadge status={post.status} />
            <button class="social__more-btn" aria-label="More options">
              <Icon name="more" size={15} />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .social { padding: 28px; height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }

  .social__header { display: flex; align-items: flex-start; justify-content: space-between; }
  .social__title    { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .social__subtitle { font-size: 12px; color: var(--cms-text-dim); margin-top: 3px; }

  .social__new-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--cms-accent); color: #06090f;
    border: none; border-radius: 8px; padding: 8px 14px;
    font-size: 13px; font-weight: 600; transition: all 0.12s;
  }
  .social__new-btn:hover { filter: brightness(1.1); }

  .social__platforms { display: flex; gap: 10px; flex-wrap: wrap; }

  .social__platform-chip {
    display: flex; align-items: center; gap: 8px;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 8px; padding: 7px 14px;
  }
  .social__platform-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--cms-green); flex-shrink: 0; }
  .social__platform-name { font-size: 12px; font-weight: 500; color: var(--cms-text-mid); }

  .social__platform-add {
    display: flex; align-items: center; gap: 6px;
    background: transparent; border: 1px dashed var(--cms-border);
    border-radius: 8px; padding: 7px 14px;
    color: var(--cms-text-dim); font-size: 12px; transition: all 0.12s;
  }
  .social__platform-add:hover { border-color: var(--cms-border-hi); color: var(--cms-text); }

  .social__empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
  .social__empty-title { font-size: 15px; font-weight: 600; color: var(--cms-text); }
  .social__empty-sub   { font-size: 13px; color: var(--cms-text-dim); }

  .social__posts { display: flex; flex-direction: column; gap: 10px; list-style: none; }

  .social__post {
    display: flex; gap: 16px; align-items: flex-start;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 12px; padding: 18px; transition: border-color 0.12s;
  }
  .social__post:hover { border-color: var(--cms-border-hi); }

  .social__post-thumb {
    width: 72px; height: 72px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--cms-border-hi), var(--cms-border));
    border: 1px solid var(--cms-border);
    display: flex; align-items: center; justify-content: center; color: var(--cms-text-dim);
  }

  .social__post-body    { flex: 1; min-width: 0; }
  .social__post-caption { font-size: 13px; color: var(--cms-text); line-height: 1.55; margin-bottom: 10px; }

  .social__post-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .social__post-platform {
    font-size: 11px; padding: 2px 8px; border-radius: 4px;
    background: var(--cms-surface); color: var(--cms-text-dim);
    border: 1px solid var(--cms-border); font-weight: 500; text-transform: capitalize;
  }

  .social__post-divider { width: 1px; height: 12px; background: var(--cms-border); flex-shrink: 0; }
  .social__post-time    { font-size: 11px; color: var(--cms-text-dim); }

  .social__post-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0; }

  .social__more-btn {
    background: none; border: none; color: var(--cms-text-dim);
    display: inline-flex; padding: 3px 4px; border-radius: 4px; transition: all 0.1s;
  }
  .social__more-btn:hover { background: var(--cms-border); color: var(--cms-text); }
</style>