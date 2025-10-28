#!/bin/bash
# Database Management Script for Ithaka
# Provides convenient commands to manage the PostgreSQL Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CONTAINER_NAME="ithaka-postgres"
DB_NAME="ithaka_db"
DB_USER="ithaka_user"

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running. Please start Docker Desktop.${NC}"
        exit 1
    fi
}

# Start the database
start() {
    echo -e "${GREEN}Starting PostgreSQL...${NC}"

    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker start $CONTAINER_NAME
        echo -e "${GREEN}PostgreSQL started successfully!${NC}"
    else
        echo -e "${YELLOW}Container doesn't exist. Creating new one...${NC}"
        docker run --name $CONTAINER_NAME \
            -e POSTGRES_USER=$DB_USER \
            -e POSTGRES_PASSWORD=ithaka_password \
            -e POSTGRES_DB=$DB_NAME \
            -p 5432:5432 \
            -d postgres:15-alpine
        echo -e "${GREEN}PostgreSQL container created and started!${NC}"
    fi

    sleep 2
    status
}

# Stop the database
stop() {
    echo -e "${YELLOW}Stopping PostgreSQL...${NC}"
    docker stop $CONTAINER_NAME
    echo -e "${GREEN}PostgreSQL stopped successfully!${NC}"
}

# Restart the database
restart() {
    echo -e "${YELLOW}Restarting PostgreSQL...${NC}"
    docker restart $CONTAINER_NAME
    echo -e "${GREEN}PostgreSQL restarted successfully!${NC}"
    sleep 2
    status
}

# Check database status
status() {
    echo -e "${GREEN}PostgreSQL Status:${NC}"
    docker ps -a --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# View logs
logs() {
    echo -e "${GREEN}PostgreSQL Logs (Ctrl+C to exit):${NC}"
    docker logs -f $CONTAINER_NAME
}

# Access PostgreSQL shell
shell() {
    echo -e "${GREEN}Connecting to PostgreSQL shell...${NC}"
    docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
}

# Backup database
backup() {
    BACKUP_DIR="./backups"
    BACKUP_FILE="${BACKUP_DIR}/ithaka_backup_$(date +%Y%m%d_%H%M%S).sql"

    mkdir -p $BACKUP_DIR
    echo -e "${GREEN}Creating backup: $BACKUP_FILE${NC}"
    docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE
    echo -e "${GREEN}Backup completed!${NC}"
}

# Restore database
restore() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please specify backup file${NC}"
        echo "Usage: ./db-manage.sh restore <backup_file.sql>"
        exit 1
    fi

    if [ ! -f "$1" ]; then
        echo -e "${RED}Error: Backup file not found: $1${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Restoring database from: $1${NC}"
    docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME < "$1"
    echo -e "${GREEN}Restore completed!${NC}"
}

# Reset database (DANGEROUS)
reset() {
    echo -e "${RED}WARNING: This will DELETE ALL DATA in the database!${NC}"
    read -p "Are you sure? Type 'yes' to continue: " confirmation

    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}Reset cancelled.${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Stopping and removing container...${NC}"
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true

    echo -e "${GREEN}Creating fresh database...${NC}"
    start
}

# Show help
help() {
    echo "Ithaka Database Management Script"
    echo ""
    echo "Usage: ./db-manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start PostgreSQL container"
    echo "  stop        - Stop PostgreSQL container"
    echo "  restart     - Restart PostgreSQL container"
    echo "  status      - Show container status"
    echo "  logs        - View PostgreSQL logs"
    echo "  shell       - Open PostgreSQL shell (psql)"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore from backup file"
    echo "  reset       - Delete all data and create fresh database (DANGEROUS)"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./db-manage.sh start"
    echo "  ./db-manage.sh logs"
    echo "  ./db-manage.sh backup"
    echo "  ./db-manage.sh restore ./backups/ithaka_backup_20241027.sql"
}

# Main script
check_docker

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    shell)
        shell
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    reset)
        reset
        ;;
    help|--help|-h|"")
        help
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        echo ""
        help
        exit 1
        ;;
esac
