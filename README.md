# [I Wanna English](https://github.com/HNRobert/I-Wanna-English)

A VSCode Extension that enforces the use of English in the Editing view

## Demo

![IWE-Demo](https://github.com/user-attachments/assets/d30bff5d-755e-4344-a6b6-c1f4e7cc4a8d)

## Why?

It's really annoying when you wanna start coding happily, but the Input method prompt suddenly jumps out and says hello to you.

This plugin would more or less solve the problem: You would switch to English automatically the moment you get into the editing view, isn't it great?

## How to use?

On Installing the Extension, you may go to the settings and find the following items:

To get started, you need to install [im-select](https://github.com/daipeihust/im-select) to help the extension switch the your input method before hitting the keyboard.

They are similar to those in the Vim Extension -- Yeah, literally the same...

After installing it, put the path of the executable in the settings using the following format:

![Settings Demo](https://github.com/user-attachments/assets/d0ab8998-899c-45fc-9b9a-0c4e8c5be698)

Then click the **Enable** option, and have fun coding!

(There is a testing function, type `>I Wanna English: Test` in the searching column above, and you will see the button)

PS: You can also replace English with any other language in the settings, as long as you like (易语言: ? (bushi)).

Meanwhile, if you want to disable this function for a while, you only need to:

- Click the status bar icon
- Use keyboard shortcut:
  - Windows/Linux: `Ctrl+Alt+E`
  - macOS: `Cmd+Option+E`

## Manually install im-select

If you encounter issues with `im-select` or need to reinstall it, you can use the `Manually install im-select` command:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Type `>I Wanna English: Manually install im-select` and select the command.

This will attempt to install `im-select` automatically and update the configuration accordingly.

## Compatibility

macOS & Windows
