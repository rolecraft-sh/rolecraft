Output assets/demos/02-create-convert.gif

Set FontSize 15
Set Width 820
Set Height 520
Set Theme "Dracula"
Set Padding 20
Set Framerate 12

Type "rolecraft init --list"
Sleep 200ms
Enter
Sleep 4000ms

Type "clear"
Sleep 100ms
Enter
Sleep 1000ms

Type "rolecraft init my-rule --template basic"
Sleep 200ms
Enter
Sleep 4000ms

Type "clear"
Sleep 100ms
Enter
Sleep 1000ms

Type "rolecraft convert ./my-rule"
Sleep 200ms
Enter
Sleep 4000ms
