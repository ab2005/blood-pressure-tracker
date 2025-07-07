const ID = 'elevenlabs-convai-widget-60993087-3f3e-482d-9570-cc373770addc';

function injectElevenLabsWidget() {
  // Check if the widget is already loaded
  if (document.getElementById(ID)) {
    return;
  }

  console.log('🚀 Starting widget injection, ClientTools available:', !!window.ClientTools);

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
  script.async = true;
  script.type = 'text/javascript';
  document.head.appendChild(script);

  // Create the wrapper and widget
  const wrapper = document.createElement('div');
  wrapper.className = 'desktop';

  const widget = document.createElement('elevenlabs-convai');
  widget.id = ID;
  widget.setAttribute('agent-id', 'agent_01jym7aznqegga4knns1xsxp3y');
  widget.setAttribute('variant', 'full');

  // Pre-register client tools BEFORE any events
  if (window.ClientTools) {
    console.log('✅ Pre-registering ClientTools:', Object.keys(window.ClientTools));
    widget.clientTools = window.ClientTools;
  } else {
    console.error('❌ ClientTools not available for pre-registration');
  }

  // Set initial colors and variant based on current theme and device
  updateWidgetColors(widget);
  updateWidgetVariant(widget);

  // Watch for theme changes and resize events
  const observer = new MutationObserver(() => {
    updateWidgetColors(widget);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Add resize listener for mobile detection
  window.addEventListener('resize', () => {
    updateWidgetVariant(widget);
  });

  function updateWidgetVariant(widget) {
    const isMobile = window.innerWidth <= 640; // Common mobile breakpoint
    if (isMobile) {
      widget.setAttribute('variant', 'expandable');
    } else {
      widget.setAttribute('variant', 'full');
    }
  }

  function updateWidgetColors(widget) {
    const isDarkMode = !document.documentElement.classList.contains('light');
    if (isDarkMode) {
      widget.setAttribute('avatar-orb-color-1', '#2E2E2E');
      widget.setAttribute('avatar-orb-color-2', '#B8B8B8');
    } else {
      widget.setAttribute('avatar-orb-color-1', '#4D9CFF');
      widget.setAttribute('avatar-orb-color-2', '#9CE6E6');
    }
  }

  // Listen for the widget's "call" event to inject client tools
  widget.addEventListener('elevenlabs-convai:call', (event) => {
    console.log('🔧 Widget call event triggered');
    console.log('🔍 Available ClientTools:', !!window.ClientTools);

    if (window.ClientTools) {
      console.log('✅ Using external ClientTools:', Object.keys(window.ClientTools));
      event.detail.config.clientTools = window.ClientTools;
    } else {
      console.error('❌ ClientTools not found during call event');
    }
  });

  // Listen for when the widget is ready
  widget.addEventListener('elevenlabs-convai:ready', (event) => {
    console.log('🚀 Widget ready event triggered');
    if (window.ClientTools) {
      console.log('✅ Registering ClientTools on ready:', Object.keys(window.ClientTools));
      widget.clientTools = window.ClientTools;
    }
  });

  // Create minimize control
  const minimizeControl = document.createElement('div');
  minimizeControl.id = 'elevenlabs-minimize-control';
  minimizeControl.innerHTML = '−';
  minimizeControl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 24px;
    font-weight: bold;
    z-index: 10000;
    user-select: none;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  `;

  // Add hover effects
  minimizeControl.addEventListener('mouseenter', () => {
    minimizeControl.style.background = 'rgba(0, 0, 0, 0.9)';
    minimizeControl.style.transform = 'scale(1.1)';
  });

  minimizeControl.addEventListener('mouseleave', () => {
    minimizeControl.style.background = 'rgba(0, 0, 0, 0.7)';
    minimizeControl.style.transform = 'scale(1)';
  });

  // Handle minimize/restore functionality
  let isMinimized = false;
  minimizeControl.addEventListener('click', () => {
    if (isMinimized) {
      // Restore widget
      widget.style.display = 'block';
      wrapper.style.display = 'block';
      minimizeControl.innerHTML = '−';
      minimizeControl.style.background = 'rgba(0, 0, 0, 0.7)';
      isMinimized = false;
    } else {
      // Minimize widget
      widget.style.display = 'none';
      wrapper.style.display = 'none';
      minimizeControl.innerHTML = '□';
      minimizeControl.style.background = 'rgba(74, 144, 226, 0.8)';
      isMinimized = true;
    }
  });

  // Listen for call state changes
  widget.addEventListener('elevenlabs-convai:call-start', () => {
    console.log('Call started - showing minimize control');
    minimizeControl.style.display = 'flex';
  });

  widget.addEventListener('elevenlabs-convai:call-end', () => {
    console.log('Call ended - hiding minimize control');
    minimizeControl.style.display = 'none';
    // Restore widget if it was minimized
    if (isMinimized) {
      widget.style.display = 'block';
      wrapper.style.display = 'block';
      isMinimized = false;
    }
  });

  // Also listen for generic state changes
  widget.addEventListener('elevenlabs-convai:state-change', (event) => {
    console.log('Widget state changed:', event.detail);
    if (event.detail && event.detail.state) {
      if (event.detail.state === 'calling' || event.detail.state === 'connected') {
        minimizeControl.style.display = 'flex';
      } else if (event.detail.state === 'idle' || event.detail.state === 'disconnected') {
        minimizeControl.style.display = 'none';
        if (isMinimized) {
          widget.style.display = 'block';
          wrapper.style.display = 'block';
          isMinimized = false;
        }
      }
    }
  });

  // Wait for widget to load and register tools properly
  widget.addEventListener('load', () => {
    console.log('📦 Widget loaded event');
    if (window.ClientTools) {
      console.log('✅ Registering tools after widget load');
      widget.setClientTools(window.ClientTools);
    }
  });

  // Attach widget and control to the DOM
  wrapper.appendChild(widget);
  document.body.appendChild(wrapper);
  document.body.appendChild(minimizeControl);

  // Final attempt: register tools after DOM insertion
  setTimeout(() => {
    if (window.ClientTools) {
      console.log('⏰ Final registration attempt via setTimeout');
      try {
        widget.clientTools = window.ClientTools;
        if (typeof widget.setClientTools === 'function') {
          widget.setClientTools(window.ClientTools);
          console.log('✅ Used setClientTools method');
        }
      } catch (error) {
        console.error('❌ Error in final registration:', error);
      }
    }
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectElevenLabsWidget);
} else {
  injectElevenLabsWidget();
}
