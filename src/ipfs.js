//using the infura.io node, otherwise ipfs requires you to run a //daemon on your own computer/server.
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
//run with local daemon
//const ipfsApi = require('ipfs-api');
//const ipfs = new ipfsApi('127.0.0.1', '5001', {protocol:'http'});
export default ipfs;


//https://gateway.ipfs.io/ipfs/