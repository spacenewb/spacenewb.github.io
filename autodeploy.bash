#!/bin/bash

read -p "DO YOU WANT TO HOST LOCALLY? (y/n)" localhosting 

if [[ $localhosting == "y" ]]; then

    read -p "DO YOU WANT TO SERVE DRAFTS? (y/n)" withdrafts

    if [[ $withdrafts == "y" ]]; then
        echo "local hosting, with drafts"
        bundle exec jekyll serve --drafts && echo && echo EXITING... && exit
    elif [[ $withdrafts == "n" ]]; then
        echo "local hosting, without drafts"
        bundle exec jekyll serve && echo && echo EXITING... && exit
    else
        echo "NOT A VALID INPUT"
        echo
        echo "EXITING..."
    fi

elif [[ $localhosting == "n" ]]; then

    read -p "DO YOU WANT TO BUILD AND PUSH? (y/n)" buildpushprompt

    if [[ $buildpushprompt == "y" ]]; then
        echo "builpushprompt yes"
        jekyll build && git checkout main && git add . && git commit -am "auto build and push" && git push && echo && echo EXITING... && exit
    elif [[ $buildpushprompt == "n" ]]; then
        echo "builpushprompt no"
        echo "NO ACTIONS CHOSEN"
        echo
        echo "EXITING..."
    else
        echo "NOT A VALID INPUT"
        echo
        echo "EXITING..."
    fi

else
    echo "NOT A VALID INPUT"
    echo
    echo "EXITING..."
fi