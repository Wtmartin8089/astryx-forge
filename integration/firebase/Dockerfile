FROM node:22.17.0-bookworm-slim
ENV HOME=/root FIREBASE_CLI_DISABLE_UPDATE_CHECK=true
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global firebase-tools@14.15.1 \
    && firebase setup:emulators:auth \
    && firebase setup:emulators:firestore \
    && firebase setup:emulators:storage
COPY firebase.json firestore.rules storage.rules /firebase/
WORKDIR /firebase
