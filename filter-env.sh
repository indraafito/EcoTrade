#!/bin/bash
if [ "$GIT_AUTHOR_NAME" = "gpt-engineer-app[bot]" ]; then
    export GIT_AUTHOR_NAME="Afito Indra Permana"
    export GIT_AUTHOR_EMAIL="indraafito56@gmail.com"
fi
if [ "$GIT_COMMITTER_NAME" = "gpt-engineer-app[bot]" ]; then
    export GIT_COMMITTER_NAME="Afito Indra Permana"
    export GIT_COMMITTER_EMAIL="indraafito56@gmail.com"
fi
