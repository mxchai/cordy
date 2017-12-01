# Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Cordova](https://cordova.apache.org/docs/en/latest/guide/cli/#installing-the-cordova-cli) (Optional)
- [Android SDK Manager](https://developer.android.com/studio/index.html) (Optional)
- An Android Emulator e.g. [GenyMotion](https://www.genymotion.com/) (Optional)

To run CorDy to get the instrumented code, you only need Node.js. The rest of the prerequisites are only necessary if you want to try running the instrumented code.

# Installation
Before running CorDy, we need to download all its dependencies by running the following command in the root directory of CorDy:
```
$ npm install
```

# Usage
## General Usage
To use CorDy:
```
$ node run.js <JS file path> <HTML file path>
```
The `<JS file path>` is the Javascript file of the cordova app while `<HTML file path>` is the corresponding its HTML file. After running the command, CorDy will output the instrumented Javascript code in a file named `output.js`.

## Example
To run CorDy on our example app, `write-file-app`:
```
$ node run.js ../write-file-app/www/js/index.js ../write-file-app/www/index.html
```
A fully functional and executable `output.js` is generated.

## Run app with `output.js`
Before running the instrumented code, please make sure that you have done the following steps
1. Created and launched a virtual device on your Android emulator
2. Installed Android SDK 19
3. Installed Cordova CLI tool

Next, you can try to replace the `index.js` of `write-file-app` with `output.js` and run as per a normal cordova app.
Type the following command in the root directory of `write-file-app`:
```
$ cordova run android
```

To see the logcat of the running app:
```
$ adb logcat
```

You can try to create and write some contents into a file and you will see a warning in the logcat:
```
12-01 02:02:47.692  2790  2790 I chromium: [INFO:CONSOLE(9)] "CORDY WARNING: Line 72 of the original JS file might be tainted.", source: file:///android_asset/www/js/index.js (9)
```
