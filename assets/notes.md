## Tips: 
https://codesupply.co/first-blog-post/

## Instructions for deploying

Follow this procedure always:

### Procedure:
1. make changes
2. host local server and verify 
3. stop local server
4. build site for deploying
5. commit changes to github
6. Check deployment in github actions
7. Visit site and verify

### Commands:
Build site:
* `jekyll build`


Host local server: --> (http://127.0.0.1:4000/)
* `bundle exec jekyll s`
* `jekyll serve`
* With drafts:
    * `jekyll serve --drafts`
    * `jekyll build --drafts`