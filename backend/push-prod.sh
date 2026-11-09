#!/bin/bash
echo "Clean the project"
./mvn clean
echo "Finished cleaning"
echo "Build the project"
./mvn package
echo "Finished building"

# Define variables
SOURCE_FILE="./target/wazi-0.0.1-SNAPSHOT.jar"
REMOTE_USER="root"
REMOTE_SERVER="188.166.171.27"
REMOTE_DIR="/root/wazi-api"
# Generate the timestamp
TIMESTAMP=$(date +%Y%m%d%H%M)
REMOTE_FILE="wazi-0.0.1-SNAPSHOT.jar"

# Derive the backup file path with the timestamp
BACKUP_FILE="backup_${TIMESTAMP}_${REMOTE_FILE}"

ssh ${REMOTE_USER}@${REMOTE_SERVER} "mkdir -p ziwa-api"
echo "ssh ${REMOTE_USER}@${REMOTE_SERVER} "mv ${REMOTE_DIR}/${REMOTE_FILE} ${REMOTE_DIR}/${BACKUP_FILE}""
# Rename the file on the remote server
ssh ${REMOTE_USER}@${REMOTE_SERVER} "mv ${REMOTE_FILE} ${BACKUP_FILE}"

# Check if the rename was successful
if [ $? -eq 0 ]; then
  echo "file moved successfully"
else
  echo "Failed to rename the file on the remote server."
fi


# Check if the source file exists
if [ -f "$SOURCE_FILE" ]; then

    # Push the copied file to the remote server
    scp "$SOURCE_FILE" "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_DIR"

    # Check if the SCP command was successful
    if [ $? -eq 0 ]; then
        echo "File successfully pushed to $REMOTE_SERVER:$REMOTE_DIR"

        echo "About to restart the app"
        ssh ${REMOTE_USER}@${REMOTE_SERVER} "systemctl restart ziwapi"

        # Check if the rename was successful
        if [ $? -eq 0 ]; then
          echo "file moved successfully"
        else
          echo "Failed to rename the file on the remote server."
        fi
    else
        echo "Failed to push the file to the remote server"
    fi
else
    echo "Source file $SOURCE_FILE does not exist"
fi

