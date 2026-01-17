# KamisamaLoader

KamisamaLoader is a mod manager designed for *Dragon Ball: Sparking! ZERO*. It aims to be a spiritual successor to Unverum, providing an easy way to manage, install, and update mods.

## Features

*   **Mod Management**: Enable, disable, and prioritize mods.
*   **One-Click Install**: Supports `kamisama://` protocol for easy installation from websites.
*   **GameBanana Integration**: Check for updates and download mods directly from GameBanana.
*   **Drag & Drop**: Easily install mods by dragging zip/rar/7z files into the application.
*   **UE4SS Support**: Automatically handles UE4SS mods and `mods.txt` configuration.
*   **LogicMods & Content Support**: correctly places files in `~mods`, `LogicMods`, or the game's `Content` directory based on file structure.

## Requirements

*   Windows 10/11
*   .NET 8.0 Desktop Runtime
*   Dragon Ball: Sparking! ZERO (Steam)

## Installation

1.  Download the latest release.
2.  Extract the archive to a folder of your choice.
3.  Run `KamisamaLoader.exe`.
4.  On first launch, point the application to your `SparkingZero-Win64-Shipping.exe` (usually located in `steamapps/common/DRAGON BALL Sparking! ZERO/SparkingZero/Binaries/Win64/`).

## Building from Source

### Prerequisites

*   .NET 8.0 SDK
*   Visual Studio 2022 (with .NET Desktop Development workload)

### Steps

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/KamisamaLoader.git
    cd KamisamaLoader
    ```
2.  Open `KamisamaLoader.sln` in Visual Studio.
3.  Build the solution (Release configuration recommended).

### Running Tests (Developers)

The core logic is separated into `KamisamaLoader.Core` which can be tested on any platform supporting .NET 8.

```bash
cd KamisamaLoader.Tests
dotnet test
```

## Usage

*   **Install Mods**: Drag and drop mod archives onto the window or use the "Download" button from the GameBanana browser tab.
*   **Enable/Disable**: Toggle the checkbox next to a mod to enable or disable it.
*   **Prioritize**: Use the Up/Down arrows to change load order. Mods at the top of the list have lower priority (load earlier), while mods at the bottom have higher priority (load later, overwriting conflicts). Note: The application automatically handles filename prefixing (`000_`, `999_`, etc.) based on list order.
*   **Build**: Click the "Build" button to apply your changes to the game directory. This is necessary after enabling/disabling or reordering mods.
*   **Updates**: Click "Check Updates" to scan for newer versions on GameBanana.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
