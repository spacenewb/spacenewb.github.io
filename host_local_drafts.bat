@ECHO OFF

::bundle exec jekyll serve --drafts

:main
    @echo off
    echo              ---Local Hosting / Build Static Site---
    echo.
    echo DO YOU WANT TO HOST LOCALLY? (y/n)
    set /p Input=Enter Yes or No:
    echo.
    If /I "%Input%"=="y" goto yes1
    goto no1

    :yes1

    echo DO YOU WANT TO SERVE DRAFTS? (y/n)
    set /p Input=Enter Yes or No:
    echo.
    If /I "%Input%"=="y" goto yes2
    goto no2
    :yes2
    bundle exec jekyll serve --drafts
    :no2
    bundle exec jekyll serve

    :no1
    echo DO YOU WANT TO BUILD AND PUSH? (y/n)
    set /p Input=Enter Yes or No:
    echo.
    If /I "%Input%"=="y" goto yes3
    goto no3
    :yes3
    jekyll build && git checkout main && git add . && git commit -am "auto build and push" && git push
    
    :no3
    echo.
    echo NO ACTIONS CHOSEN
    echo.
    echo EXITING...
    exit