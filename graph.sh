#!/bin/bash
# Helper script to run code-review-graph commands
# Use: ./graph.sh build | ./graph.sh watch

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$DIR/.venv/bin/activate"
code-review-graph "$@"
