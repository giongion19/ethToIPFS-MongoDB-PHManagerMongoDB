import React, { Component } from 'react';
import web3 from './web3';
import ipfs from './ipfs';
import contractPresenceHistoryManager from './contract';
import { Button } from 'reactstrap';
import axios from 'axios';
var hash = require('object-hash');


class App extends Component {
  state = { ipfsHash: null, buffer: '', usrPseud: 'TESTUSR', ethAddress: '', transactionHash: '', 
            txReceipt: '', finalURL: '', latestPresenceTimestamp: '', latestPresenceHash: '', blockNumber: '', gasUsed: '' };
  
  //Take file input from user
  captureFile = (event) => {
    event.stopPropagation()
    event.preventDefault()
    const file = event.target.files[0]
    let reader = new window.FileReader()
    reader.readAsArrayBuffer(file)
    reader.onloadend = () => this.convertToBuffer(reader)
  }; 
  convertToBuffer = async (reader) => {
    //file is converted to a buffer for upload 
    const buffer = await Buffer.from(reader.result);
    this.setState({ buffer });
  };


  changeUserPseud = async () => {
    this.setState({ usrPseud: document.getElementById('usrPseudonymHash').value })
  };

  onClick = async () => {
    try {
      await web3.eth.getTransactionReceipt(this.state.transactionHash, (err, txReceipt) => {
        console.log(err, txReceipt);
        this.setState({ txReceipt });
        this.setState({ blockNumber: txReceipt ? txReceipt.blockNumber : "Waiting.. try again in a few seconds" });
        this.setState({ gasUsed: txReceipt ? txReceipt.gasUsed : "Waiting.. try again in a few seconds" });
      });
    } catch (error) {
      console.log(error);
      this.setState({ blockNumber: "Error:" + error.message });
      this.setState({ gasUsed: "Error:" + error.message });
    }
  }
  onSubmitOnIPFS = async (event) => {
    event.preventDefault();
    //bring in user's metamask account address      
    const accounts = await web3.eth.getAccounts();
    //obtain contract address from contractPresenceHistoryManager.js      
    const ethAddress = await contractPresenceHistoryManager.options.address;
    this.setState({ ethAddress });
    //save document to IPFS,return its hash#, and set hash# to state      
    await ipfs.add(this.state.buffer, (err, ipfsHash) => {
      console.log(err, ipfsHash);
      //setState by setting ipfsHash to ipfsHash[0].hash        
      this.setState({ ipfsHash: ipfsHash[0].hash });
      // call Ethereum contract method "newInfection" and .send IPFS hash to etheruem contract
      //return the transaction hash from the ethereum contract
      contractPresenceHistoryManager.methods.newInfection(web3.utils.asciiToHex(this.state.usrPseud), this.state.ipfsHash).send({
        from: accounts[0]
      }, (error, transactionHash) => {
        this.setState({ transactionHash });
      });
    })
  };

  onSubmitOnMongo = async (event) => {
    event.preventDefault();
    //bring in user's metamask account address      
    const accounts = await web3.eth.getAccounts();
    //obtain contract address from contractPresenceHistoryManager.js      
    const ethAddress = await contractPresenceHistoryManager.options.address;
    this.setState({ ethAddress });

    var hashedFile = hash(this.state.buffer);
    contractPresenceHistoryManager.methods.newInfection(web3.utils.asciiToHex(this.state.usrPseud), hashedFile).send({
      from: accounts[0]
    }, (error, transactionHash) => {
      this.setState({ transactionHash });
    });
    await axios.post("http://localhost:3300/records/newInfection", { id: this.state.usrPseud, fileBuffer: this.state.buffer,
                                                                      presenceHistoryHash: hashedFile });
  };

  onCheckPastEvent = async () => {
    var contractAddress = await contractPresenceHistoryManager.options.address;
    var eventName = "newHistoryInserted";
    const pseudonymHash = web3.utils.asciiToHex(this.state.usrPseud);

    const events = await contractPresenceHistoryManager.getPastEvents(eventName, {
      filter: {
        from: contractAddress,
        pseudonymHash
      },
      fromBlock: 0,
      toBlock: 'latest'
    })

    var table = document.createElement('table');
    var hr = document.createElement('hr');
    table.appendChild(hr);

    events.forEach(element => {
      var tr = document.createElement('tr');

      var td1 = document.createElement('td');
      var td2 = document.createElement('td');
      var td3 = document.createElement('td');
      var td4 = document.createElement('td');

      var text1 = document.createTextNode('PresenceHistoryHash  : ');
      var text2 = document.createTextNode(element.returnValues['presenceHistoryHash']);
      var text3 = document.createTextNode('Timestamp  : ');
      var text4 = document.createTextNode(element.returnValues['timestamp']);

      td1.appendChild(text1);
      td2.appendChild(text2);
      td3.appendChild(text3);
      td4.appendChild(text4);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);

      table.appendChild(tr);
    })
    document.body.appendChild(table);
  };

  onCheckLatestEvent = async () => {
    this.setState({ usrPseud: document.getElementById('insPseudonymHash').value })
    var contractAddress = await contractPresenceHistoryManager.options.address;
    var eventName = "newHistoryInserted";
    const pseudonymHash = web3.utils.asciiToHex(this.state.usrPseud);

    const events = await contractPresenceHistoryManager.getPastEvents(eventName, {
      filter: {
        from: contractAddress,
        pseudonymHash
      },
      fromBlock: 0,
      toBlock: 'latest'
    })
    if (events.length === 0) {
      this.setState({ latestPresenceHash: "Cannot find presence with the pseudonym indicated" });
      this.setState({ latestPresenceTimestamp: "----" });
    }

    events.forEach(element => {
      var latestPresenceHash = element.returnValues['presenceHistoryHash'];
      var latestPresenceTimestamp = element.returnValues['timestamp'];
      var finalURL = "https://gateway.ipfs.io/ipfs/" + element.returnValues['presenceHistoryHash'];
      this.setState({ latestPresenceHash });
      this.setState({ latestPresenceTimestamp });
      this.setState({ finalURL });
    })

    
  };


  getDataFromMongoDB = async () => {
    var toSearch = document.getElementById('insPseudonymHashDB').value;
    const response = await axios.get(`http://localhost:3300/searchBy?userPseudonymId=${toSearch}`);
    const json = await response.data;
    if (json.length === 0) {
      this.setState({ latestPresenceHash: "Cannot find presence with the pseudonym indicated" });
      this.setState({ latestPresenceTimestamp: "----" });
    }
    else {
      json.forEach(element => {
        var latestPresenceHash = element.lastPresenceHistory_hash;
        var latestPresenceTimestamp = element.lastPresenceHistory_timestamp;
        this.setState({ latestPresenceHash });
        this.setState({ latestPresenceTimestamp });
      })
    }
  };

  render() {
    return (
      <center>
        <div className="App">
          <header className="App-header">
            <h1>Integrazione della blockchain Ethereum con storage off-chain:</h1>
            <h1>soluzioni centralizzate key-value e decentralizzate content-addressable</h1>
          </header>
          <hr />
          <h3> Choose file to send to MongoDB </h3>
          <form onSubmit={this.onSubmitOnMongo}>
            <input type="file" onChange={this.captureFile} />
            <Button type="submit"> Send it</Button>
          </form>
          &nbsp;
          <hr />
          <h3> Get Information from MongoDB </h3>
          <input id="insPseudonymHashDB" type="text" placeholder="User Pseudonym" />&nbsp;
          <Button type="button" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            this.getDataFromMongoDB();
          }}> Get Data from MongoDB </Button>
          <hr />
          <hr />
          <h3> Data Information</h3>
          <table>
            <thead>
              <tr>
                <th>Presence History Data</th>
                <th></th>
                <th>Values</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Last Presence History Timestamp</td>
                <td>&nbsp;:</td>
                <td>{this.state.latestPresenceTimestamp}</td>
              </tr>
              <tr>
                <td>Last Presence History Hash</td>
                <td>&nbsp;:</td>
                <td>{this.state.latestPresenceHash}</td>
              </tr>
            </tbody>
          </table>
          <hr/>
          <hr />
          <h3>Ethereum Data Information</h3>
          <table>
            <thead>
              <tr>
                <th>Transaction Receipt Category</th>
                <th></th>
                <th>Values</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ethereum Contract Address</td>
                <td>&nbsp;:</td>
                <td>{this.state.ethAddress}</td>
              </tr>
              <tr>
                <td>Transaction Hash # </td>
                <td>&nbsp;:</td>
                <td>{this.state.transactionHash}</td>
              </tr>
              <tr>
                <td>Gas Used </td>
                <td>&nbsp;:</td>
                <td>{this.state.gasUsed}</td>
              </tr>
              <tr>
                <td>Block Number # </td>
                <td>&nbsp;:</td>
                <td>{this.state.blockNumber}</td>
              </tr>
            </tbody>
            <Button onClick={this.onClick}> Get Transaction Data </Button>
          </table>
          <hr/>
          <hr />
          <h3> Choose  file to send to IPFS</h3>
          <form onSubmit={this.onSubmitOnIPFS}>
            <input type="file" onChange={this.captureFile} />
            <Button type="submit"> Send it</Button>
          </form>

          <hr />
          <h3>Get Information from IPFS </h3>
          <tr>
            <td>IPFS Hash stored on Ethereum</td>
            <td>&nbsp;:</td>
            <td>{this.state.ipfsHash}</td>
          </tr>
          <tr>
            &nbsp;
          </tr>
          <tr>
            <td>
              <input id="insPseudonymHash" type="text" placeholder="User Pseudonym" />
              &nbsp;
            </td>
            <td>
              <Button onClick={this.onCheckLatestEvent}> Get last Data </Button>
            </td>
            <td>&nbsp;
              <Button type="button" onClick={(e) => {
                e.preventDefault();
                if (this.state.finalURL === '')
                  alert("You must search by user pseudonym before")
                else
                  window.window.open(this.state.finalURL, "Gateway URL");
              }}> Get PresenceFile using Gateway.IPFS</Button>
            </td>
          </tr>
        </div>
        
        &nbsp;
        &nbsp;
        <hr />
        <hr />
        <hr />
        <hr />
        <input id="usrPseudonymHash" type="text" placeholder="User Pseudonym" />
        <Button type="button" onClick={(e) => {
          this.changeUserPseud();
        }}> CHANGE PSEUDONYM</Button>
      </center>
    );
  }
}

export default App;
