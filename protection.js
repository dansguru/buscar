(() => {
  const isEditable = (target) => target instanceof Element
    && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');

  document.addEventListener('contextmenu', (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    if (isEditable(event.target)) return;

    const key = event.key.toLowerCase();
    const inspectShortcut = event.key === 'F12'
      || ((event.ctrlKey || event.metaKey) && key === 'u')
      || ((event.ctrlKey || event.metaKey) && (event.shiftKey || event.altKey) && ['i', 'j', 'c', 'k'].includes(key));

    if (inspectShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
