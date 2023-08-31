import mongodb from 'mongodb';
import { createTunnel } from 'tunnel-ssh';
const { MongoClient } = mongodb;

const sshConfig = {
  username: process.env.SSH_USERNAME,
  host: process.env.SSH_HOST,
  password: process.env.SSH_PASSWORD,
  port: process.env.SSH_PORT,
  dstHost: '172.20.0.2', // MongoDB Docker container IP
  dstPort: 27017, // MongoDB port
  localHost: '127.0.0.1', // Local machine IP
  localPort: 27017 // Local machine port
};

const tunnelOptions = {
  autoClose: true
};
const serverOptions = {
  port: sshConfig.dstPort
};
const sshOptions = {
  host: sshConfig.host,
  port: sshConfig.port,
  username: sshConfig.username,
  password: sshConfig.password
};
const forwardOptions = {
  srcAddr: sshConfig.localHost,
  srcPort: sshConfig.localPort,
  dstAddr: sshConfig.dstHost,
  dstPort: sshConfig.dstPort
};

const connectToDb = async () => {
  try {
    let [server, conn] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);

    const url = `mongodb://localhost:${sshConfig.localPort}/catapult`;
    console.log(`MongoDB Connection URL: ${url}`);

    return new Promise((resolve, reject) => {
      MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (error, db) => {
        if (error) {
          console.log(`MongoDB Connection: FAILED ${error}`);
          reject(error);
        } else {
          console.log("MongoDB Connection: SUCCESS");
          resolve(db);
        }
      });
    });
  } catch (error) {
    console.log("SSH Connection Error: " + error);
    throw error;
  }
};

export default connectToDb;
