// Global variables for window management
let activeWindow = null;
let windowZIndex = 10;
let dragData = {
  isDragging: false,
  startX: 0,
  startY: 0,
  initialLeft: 0,
  initialTop: 0,
  element: null,
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeClock();
  initializeDesktopIcons();
  initializeWindowControls();
  initializeTaskbar();
  initializeStartMenu();

  // Close start menu when clicking elsewhere
  document.addEventListener("click", function (e) {
    if (
      !e.target.closest("#start-button") &&
      !e.target.closest("#start-menu")
    ) {
      document.getElementById("start-menu").style.display = "none";
    }
  });
});

// Clock functionality - updates every second
function initializeClock() {
  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("clock").textContent = timeString;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// Desktop icon click handlers
function initializeDesktopIcons() {
  const icons = document.querySelectorAll(".desktop-icon");

  icons.forEach((icon) => {
    icon.addEventListener("click", function (e) {
      e.stopPropagation();

      // Remove selection from other icons
      icons.forEach((i) => i.classList.remove("selected"));

      // Select current icon
      this.classList.add("selected");
    });

    // Double click to open window
    icon.addEventListener("dblclick", function () {
      const windowId = this.dataset.window;
      openWindow(windowId);
    });
  });

  // Click desktop to deselect all icons
  document.getElementById("desktop").addEventListener("click", function () {
    icons.forEach((i) => i.classList.remove("selected"));
  });
}

// Window management functions
function openWindow(windowId) {
  const window = document.getElementById(windowId);
  if (!window) return;

  // Show window with opening animation
  window.style.display = "block";
  window.classList.add("opening");

  // Set as active window
  setActiveWindow(window);

  // Add to taskbar
  addToTaskbar(windowId, window.querySelector(".title-bar span").textContent);

  // Remove animation class after animation completes
  setTimeout(() => {
    window.classList.remove("opening");
  }, 200);
}

function closeWindow(window) {
  window.classList.add("closing");

  setTimeout(() => {
    window.style.display = "none";
    window.classList.remove("closing", "active", "inactive");
    removeFromTaskbar(window.id);

    // Set next window as active if any
    const visibleWindows = document.querySelectorAll('.window[style*="block"]');
    if (visibleWindows.length > 0) {
      setActiveWindow(visibleWindows[visibleWindows.length - 1]);
    } else {
      activeWindow = null;
    }
  }, 200);
}

function minimizeWindow(window) {
  window.classList.add("minimizing");

  setTimeout(() => {
    window.style.display = "none";
    window.classList.remove("minimizing", "active");
    window.classList.add("inactive");

    // Set next window as active if any
    const visibleWindows = document.querySelectorAll(
      '.window[style*="block"]:not(.inactive)'
    );
    if (visibleWindows.length > 0) {
      setActiveWindow(visibleWindows[visibleWindows.length - 1]);
    } else {
      activeWindow = null;
    }

    // Update taskbar item appearance
    updateTaskbarItem(window.id, false);
  }, 300);
}

function restoreWindow(windowId) {
  const window = document.getElementById(windowId);
  if (!window) return;

  window.style.display = "block";
  window.classList.remove("inactive");
  setActiveWindow(window);
  updateTaskbarItem(windowId, true);
}

function setActiveWindow(window) {
  // Remove active class from all windows
  document.querySelectorAll(".window").forEach((w) => {
    w.classList.remove("active");
    w.classList.add("inactive");
  });

  // Set current window as active
  window.classList.add("active");
  window.classList.remove("inactive");
  window.style.zIndex = ++windowZIndex;
  activeWindow = window;

  // Update taskbar
  updateTaskbarItem(window.id, true);
}

// Window control buttons
function initializeWindowControls() {
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("close-btn")) {
      const window = e.target.closest(".window");
      closeWindow(window);
    }

    if (e.target.classList.contains("minimize-btn")) {
      const window = e.target.closest(".window");
      minimizeWindow(window);
    }
  });

  // Window click to bring to front
  document.addEventListener("click", function (e) {
    const window = e.target.closest(".window");
    if (window && window.style.display === "block") {
      setActiveWindow(window);
    }
  });

  // Initialize dragging functionality
  initializeDragging();
}

// Window dragging functionality
function initializeDragging() {
  document.addEventListener("mousedown", function (e) {
    const titleBar = e.target.closest(".title-bar");
    if (!titleBar) return;

    const window = titleBar.closest(".window");
    if (!window) return;

    dragData.isDragging = true;
    dragData.element = window;
    dragData.startX = e.clientX;
    dragData.startY = e.clientY;
    dragData.initialLeft = parseInt(window.style.left) || 0;
    dragData.initialTop = parseInt(window.style.top) || 0;

    setActiveWindow(window);
    e.preventDefault();
  });

  document.addEventListener("mousemove", function (e) {
    if (!dragData.isDragging || !dragData.element) return;

    const deltaX = e.clientX - dragData.startX;
    const deltaY = e.clientY - dragData.startY;

    const newLeft = dragData.initialLeft + deltaX;
    const newTop = dragData.initialTop + deltaY;

    // Keep window within viewport bounds
    const maxLeft = window.innerWidth - dragData.element.offsetWidth;
    const maxTop = window.innerHeight - dragData.element.offsetHeight - 40; // Account for taskbar

    dragData.element.style.left =
      Math.max(0, Math.min(newLeft, maxLeft)) + "px";
    dragData.element.style.top = Math.max(0, Math.min(newTop, maxTop)) + "px";
  });

  document.addEventListener("mouseup", function () {
    dragData.isDragging = false;
    dragData.element = null;
  });
}

// Taskbar functionality
function initializeTaskbar() {
  // Start button functionality is handled in initializeStartMenu()
}

function addToTaskbar(windowId, title) {
  const existingItem = document.querySelector(`[data-window-id="${windowId}"]`);
  if (existingItem) return; // Already in taskbar

  const taskbarItems = document.getElementById("taskbar-items");
  const item = document.createElement("div");
  item.className = "taskbar-item active";
  item.dataset.windowId = windowId;
  item.textContent = title;

  item.addEventListener("click", function () {
    const window = document.getElementById(windowId);
    if (
      window.style.display === "none" ||
      window.classList.contains("inactive")
    ) {
      restoreWindow(windowId);
    } else {
      minimizeWindow(window);
    }
  });

  taskbarItems.appendChild(item);
}

function removeFromTaskbar(windowId) {
  const item = document.querySelector(`[data-window-id="${windowId}"]`);
  if (item) {
    item.remove();
  }
}

function updateTaskbarItem(windowId, isActive) {
  const item = document.querySelector(`[data-window-id="${windowId}"]`);
  if (item) {
    if (isActive) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  }
}

// Start menu functionality
function initializeStartMenu() {
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");

  startButton.addEventListener("click", function (e) {
    e.stopPropagation();
    const isVisible = startMenu.style.display === "block";
    startMenu.style.display = isVisible ? "none" : "block";
  });
}

// Start menu functions - easily extendable
function changeWallpaper() {
  const newWallpaper = prompt(
    "Enter image URL for new wallpaper:",
    "https://i.imgur.com/5bh6eLS.png"
  );
  if (newWallpaper) {
    document.body.style.backgroundImage = `url('${newWallpaper}')`;
  }
  document.getElementById("start-menu").style.display = "none";
}

function showAbout() {
  alert(
    "Windows 95 Style Portfolio\nBuilt with HTML, CSS, and JavaScript\n\n© I.K. Guillermo All rights reserved"
  );
  document.getElementById("start-menu").style.display = "none";
}

function closeAllWindows() {
  const openWindows = document.querySelectorAll('.window[style*="block"]');
  openWindows.forEach((window) => {
    closeWindow(window);
  });
  document.getElementById("start-menu").style.display = "none";
}

// Utility function to add new desktop icons easily
function addDesktopIcon(iconData) {
  const desktop = document.getElementById("desktop");
  const icon = document.createElement("div");
  icon.className = "desktop-icon";
  icon.dataset.window = iconData.windowId;

  icon.innerHTML = `
                <div class="icon-image">${iconData.emoji}</div>
                <div class="icon-label">${iconData.label}</div>
            `;

  desktop.appendChild(icon);

  // Re-initialize icon functionality
  initializeDesktopIcons();
}

// Example of how to add a new icon programmatically:
// addDesktopIcon({
//     windowId: 'new-app',
//     emoji: '🎨',
//     label: 'Art Gallery'
// });
