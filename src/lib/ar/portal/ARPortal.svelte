<script>
  let { theme = 'narrador', contentType = 'image', onExit, children } = $props();
</script>

<div>
  {@render children?.(null)}
</div>
