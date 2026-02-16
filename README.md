# SidePlay - Spatial Audio Controller

A lightweight Chrome extension designed for users who need precise control over their browser's spatial audio. It allows you to isolate a tab's audio output to specifically the left or right channel with a single click.

Perfect for multitasking with multiple audio sources, language learning, or creating an immersive multi-content experience.

## Features

- 🎧 **Left Channel Only** - Isolate audio to your left ear
- 🎧 **Right Channel Only** - Isolate audio to your right ear  
- 🔊 **Stereo (Default)** - Normal two-channel audio output
- ⚡ **Lightweight** - Minimal performance impact
- 🔒 **Privacy-First** - All audio processing happens locally

## Use Cases

- **Dual Video Watching** - Watch two videos simultaneously, each in a different ear
- **Language Learning** - Compare pronunciation by playing native speakers in separate ears
- **Audio Focus** - Isolate audio streams to prevent interference
- **Accessibility** - Spatial audio control for hearing preferences

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/chnlich/chrome-sideplay-extension.git
   cd chrome-sideplay-extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** in the top right corner

4. Click **Load unpacked** and select the extension directory

5. The extension icon will appear in your toolbar

### Chrome Web Store (Coming Soon)

*Pending review*

## Usage

1. Navigate to any website with audio (YouTube, Spotify, etc.)
2. Click the SidePlay icon in your toolbar
3. Select your desired channel:
   - **Left** - Audio plays only in left ear
   - **Right** - Audio plays only in right ear
   - **Stereo** - Normal audio output

## Technical Details

### Architecture

- **Manifest V3** - Uses the latest Chrome extension APIs
- **Offscreen Document** - Handles audio capture and processing
- **Web Audio API** - Real-time audio channel manipulation

### How It Works

1. Captures the active tab's audio stream using `chrome.tabCapture`
2. Routes audio through an offscreen document for processing
3. Uses Web Audio API's `ChannelSplitterNode` to separate channels
4. Applies gain control via `GainNode` to mute unwanted channels
5. Outputs modified audio through `ChannelMergerNode`

### Permissions

- `tabCapture` - Required to capture tab audio
- `offscreen` - Required for background audio processing
- `storage` - Saves channel preferences per tab

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 109+ | ✅ Full Support |
| Edge | 109+ | ✅ Full Support |
| Opera | 95+ | ✅ Full Support |
| Firefox | - | ❌ Not Supported (Manifest V3 limitation) |

## Known Limitations

- Audio capture requires the tab to be actively playing audio
- Channel settings reset when the page is refreshed
- Some DRM-protected content may not be captured (Netflix, Spotify Web, etc.)

## Development

### Project Structure

```
chrome-sideplay-extension/
├── manifest.json        # Extension manifest (V3)
├── background.js        # Service worker for tab management
├── offscreen.html       # Offscreen document for audio processing
├── popup.html           # Extension popup UI
├── popup.js             # Popup interaction logic
├── icon16.png           # Extension icons
├── icon48.png
├── icon128.png
└── README.md            # This file
```

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the SidePlay card
4. Test your changes

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Built with [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- Audio processing powered by [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

**Made with ❤️ for spatial audio enthusiasts**
