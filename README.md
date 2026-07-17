# BUG (Browsing Using Gestures)

BUG is a next-generation Chrome Extension that allows you to navigate the web entirely hands-free. Using advanced in-browser machine learning (Human.js) and the Web Speech API, BUG translates your head movements, facial expressions, and voice into precise browser controls. 

Designed for accessibility, multitasking, and futuristic browsing, BUG runs entirely locally in your browser to guarantee maximum privacy and zero latency.

---

## ✨ Features

- **🎯 Face-Tracked Cursor**: Control the mouse pointer smoothly by just moving your head.
- **🧲 Aim Assist Snapping**: The cursor intelligently snaps to nearest clickable elements (buttons, links, inputs) to make selection effortless.
- **⏱️ Dwell Clicking**: Hover your cursor over an element for ~1.2 seconds to automatically click it.
- **👄 Mouth Clicking**: Open your mouth slightly to trigger an instant click without waiting for dwell time.
- **📜 Edge Scrolling**: Look towards the top or bottom edge of your screen to smoothly scroll the page up or down.
- **🔙 Gesture Navigation**: Look to the far left or right edges to seamlessly navigate Back or Forward in your browser history.
- **🔄 Circle Shortcut**: Make a large circular motion with your head to instantly jump to the Google homepage.
- **🎤 Instant Voice Commands**: Speak single-word commands for instant actions. 
  - Say `"up"`, `"down"`, `"top"`, `"bottom"` for scrolling.
  - Say `"back"`, `"forward"`, `"refresh"` for navigation.
  - Say `"click"` to click the hovered element.
  - Say `"search [your query]"` to open a new tab with a Google search.

---

## 🚀 How to Install (Developer Mode)

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable the **"Developer mode"** toggle in the top right corner.
4. Click the **"Load unpacked"** button in the top left.
5. Select the `BUG` project folder.
6. The extension is now installed! Click the extension icon in your toolbar to open the Face Navigator side panel.

> **Note:** On first launch, the extension will ask for Camera permissions to track your face, and Microphone permissions (if you enable voice commands).

---

## 🛠️ How It Works (Architecture & Files)

The extension is split across several isolated environments using Manifest V3 architecture. Here is a breakdown of what every file does:

### 1. `manifest.json`
The configuration file that tells Chrome how to load the extension. It defines the permissions needed (`activeTab`, `scripting`, `sidePanel`), sets up the background service worker, and registers the UI side panel.

### 2. `scripts/background.js` (Service Worker)
The invisible background script that manages the extension's lifecycle. 
- Opens the side panel when you click the extension icon.
- Monitors when you switch tabs or reload pages, and automatically re-injects the content script into the new page so your cursor tracking never breaks.

### 3. `sidepanel/sidepanel.html` & `sidepanel.css`
The user interface that lives in Chrome's side panel. It contains the webcam feed, the calibration tools, and all the toggles/sliders to customize your experience (Aim Assist, Sensitivity, Voice Toggles, etc.).

### 4. `scripts/sidepanel.js` (The Brain)
Runs inside the side panel and handles the heavy lifting:
- Requests camera permissions and runs the video stream.
- Instantiates the **Human.js** AI model to detect your face and calculate head rotation (yaw/pitch) and mouth distance.
- Translates face data into X/Y coordinates and applies smoothing filters.
- Sends continuous `move_cursor` messages and configuration updates to the active webpage.

### 5. `scripts/content.js` (The Hands)
Injected directly into the webpage you are currently viewing. It listens for messages from the side panel and manipulates the page:
- Draws the red cursor, aim-assist rings, and edge-scroll glow overlays on top of the website.
- Scans the DOM for clickable elements and calculates the nearest target for Aim Assist.
- Executes physical actions like `window.scrollBy` and `element.click()`.
- Runs the **Web Speech API** (`SpeechRecognition`) in the background to listen for your voice commands with zero latency.

---

## 💻 Technologies Used

- **HTML5 & CSS3**: For building the lightweight side panel UI and custom rendering styles for the tracking cursor on webpages.
- **Vanilla JavaScript (JS)**: The core logic of the entire extension. Built without heavy frameworks to ensure maximum injection speed and minimal memory footprint inside the browser.
- **Human.js (TensorFlow.js)**: A lightweight, privacy-focused machine learning library running entirely in the browser. It handles the facial detection and head-pose estimation without sending any camera data to a server.
- **Facemesh**: The specific underlying machine learning model (run via Human.js) used to map 3D facial landmarks in real-time, allowing us to accurately track mouth opening distance and head rotation.
- **Chrome Extensions API (Manifest V3)**: The modern standard for building secure, performant browser extensions.
- **Web Speech API (`webkitSpeechRecognition`)**: Built directly into the browser, it converts speech-to-text in real-time. We use `interimResults` to execute commands instantly while you are still speaking, eliminating cloud processing latency.
