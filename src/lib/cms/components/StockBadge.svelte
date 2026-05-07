<!-- =============================================================================
     lib/cms/components/StockBadge.svelte
     Displays stock quantity with colour-coded states:
       - Normal  (>10)  → muted
       - Low     (1-10) → amber warning
       - Out     (0)    → red danger
     ============================================================================= -->
<script lang="ts">
  const { stock }: { stock: number } = $props();

  const state = $derived(
    stock === 0  ? 'out' :
    stock <= 10  ? 'low' : 'ok'
  );

  const label = $derived(stock === 0 ? 'Out of stock' : String(stock));
</script>

<span class="stock stock--{state} cms-mono">
  {label}
</span>

<style>
  .stock {
    font-size:   12px;
    font-weight: 500;
  }

  .stock--ok {
    color: var(--cms-text-dim);
  }

  .stock--low {
    color:         var(--cms-amber);
    background:    rgba(245, 184, 0, 0.08);
    padding:       2px 7px;
    border-radius: 6px;
  }

  .stock--out {
    color:         var(--cms-red);
    background:    rgba(255, 64, 96, 0.08);
    padding:       2px 7px;
    border-radius: 6px;
  }
</style>