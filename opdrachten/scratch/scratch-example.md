---
title: Scratch Voorbeeld
acknowledgements:
  author(s): CoderDojo Zoetermeer
level: 1
template: default
progLang: scratch3
theme: scratch
description: |
  Een voorbeeld Scratch opdracht met Scratch blokken
infoBlocks:
  - title: Voorkennis
    content: |
      - Je kent de Scratch interface
      - Je weet wat sprites zijn

  - title: Leerdoelen
    content: |
      - Leren werken met bewegingsblokken
      - Leren werken met lussen
      - Leren werken met variabelen
---

********************************************************************************

::: read

*Introductie*

In deze opdracht leer je hoe je een sprite kunt laten bewegen in Scratch. Je
gaat de kat laten lopen, draaien en punten bijhouden.

:::

________________________________________________________________________________

::: read

*Stap 1: De kat laten bewegen*

Voeg de volgende blokken toe aan je sprite. Klik op de groene vlag om het
programma te starten.

```scratch
when green flag clicked
go to x: (-200) y: (0)
forever
  move (5) steps
  if <touching [edge v]?> then
    go to x: (-200) y: (0)
  end
end
```

:::

________________________________________________________________________________

:::: program

*Laat de kat stappen zetten*

Voeg de volgende blokken toe zodat de kat ook een loopanimatie maakt.

```scratch
when green flag clicked
forever
  next costume
  wait (0.1) secs
end
```

::::

________________________________________________________________________________

::: read

*Stap 2: Punten bijhouden*

Met een variabele kun je bijhouden hoeveel rondes de kat heeft gerend. Maak
een variabele aan met de naam **punten** en voeg deze blokken toe.

```scratch
when green flag clicked
set [punten v] to (0)
forever
  move (5) steps
  if <touching [edge v]?> then
    change [punten v] by (1)
    go to x: (-200) y: (0)
  end
end
```

:::

________________________________________________________________________________

::: read

*Stap 3: Een bericht zeggen*

Laat de kat iets zeggen als hij de rand raakt.

```scratch
when green flag clicked
forever
  move (5) steps
  if <touching [edge v]?> then
    say [Ronde compleet!] for (1) secs
    change [punten v] by (1)
    go to x: (-200) y: (0)
  end
end
```

:::

________________________________________________________________________________

::: challenge

*Uitdaging*

Probeer de volgende dingen:

- Maak de kat sneller of langzamer
- Laat de kat stoppen na 5 rondes
- Voeg een geluid toe als de kat de rand raakt

:::
