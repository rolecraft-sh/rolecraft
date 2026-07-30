Output assets/demos/05-publish-search.gif

Set FontSize 15
Set Width 820
Set Height 520
Set Theme "Dracula"
Set Padding 20
Set Framerate 12

Type "rolecraft search mcp --registry"
Sleep 200ms
Enter
Sleep 5000ms

Type "clear"
Sleep 100ms
Enter
Sleep 1000ms

Type "rolecraft init my-skill --template basic"
Sleep 200ms
Enter
Sleep 4000ms

Type "clear"
Sleep 100ms
Enter
Sleep 1000ms

Type "rolecraft publish ./my-skill --dry-run"
Sleep 200ms
Enter
Sleep 4000ms
