#!/bin/bash

# Alpha~ Cryptocurrency Node Startup Script

echo "========================================"
echo "   Alpha~ Cryptocurrency Node"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check dependencies
echo "Checking dependencies..."
python3 -c "import ecdsa, cryptography, requests, flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing dependencies..."
    pip install -r ../requirements.txt
fi

# Default values
HOST="0.0.0.0"
PORT=8080
PEERS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host) HOST="$2"; shift 2 ;;
        --port) PORT="$2"; shift 2 ;;
        --peers) PEERS="$2"; shift 2 ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "  --host HOST      Host to bind to (default: 0.0.0.0)"
            echo "  --port PORT      Port to listen on (default: 8080)"
            echo "  --peers PEERS    Comma-separated list of peer addresses"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Start the node
echo "Starting Alpha~ node..."
echo "Host: $HOST"
echo "Port: $PORT"
if [ ! -z "$PEERS" ]; then
    echo "Peers: $PEERS"
fi
echo ""

cd ../src
python3 node.py --host "$HOST" --port "$PORT" --peers "$PEERS"