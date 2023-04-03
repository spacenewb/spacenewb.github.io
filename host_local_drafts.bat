@ECHO OFF

::bundle exec jekyll serve --drafts

:main
    @echo off
    echo              ---Local Hosting / Build Static Site---
    echo.
    echo DO YOU WANT TO HOST LOCALLY? (y/n)
    set /p Input=Enter Yes or No:
    echo.
    If /I "%Input%"=="y" goto localhosting
    goto buildpushprompt

    :localhosting
    echo DO YOU WANT TO SERVE DRAFTS? (y/n)
    set /p Input=Enter Yes or No:
    echo.
    If /I "%Input%"=="y" goto withdrafts
    goto withoutdrafts

        :withdrafts
        bundle exec jekyll serve --drafts
        echo EXITING...
        exit

        :withoutdrafts
        bundle exec jekyll serve
        echo EXITING...
        exit

    :buildpushprompt
    echo DO YOU WANT TO BUILD AND PUSH? (y/n)
    set /p Input=Enter Yes or No:
    echo.
    If /I "%Input%"=="y" goto buildpush
    goto nothing

        :buildpush
        jekyll build && git checkout main && git add . && git commit -am "auto build and push" && git push ^
         echo EXITING...
         exit

        :nothing
        echo.
        echo NO ACTIONS CHOSEN
        echo.
        echo EXITING...
        exit