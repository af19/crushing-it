import React from 'react';
import Nominee from './Nominee';
import Winner from './Winner';
import Inputs from './Inputs';
import Buttons from './Buttons';
import db from './database';
import fbRef from './databaseRT';
import './App.scss';
import './themes/pages/leaderboard.scss';
import './themes/pages/profile.scss';
import mp3Audio from './audio/playwithus.mp3'; //mp3 for halloween

class App extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            nominees: [],
            winner: "",
            timesOfNomination: [],
            input: "",
            quantityField: "1",
            labelButton: "CRUSHING IT!!",
            winnerWins: "",
            winnerNominations: ""
        }
    }

    componentDidMount() {

        // apply seasonal styling if available
        let month = new Date().toLocaleString('default', { month: 'long' }).toLowerCase();
        document.body.classList.add(month);
        try {
          require(`./themes/${month}.scss`);
        }
        catch(err) {
          require('./themes/default.scss');
        }

        this.startListening();
    }


    onInputChange(e) { 
        let value = e.target.value.toLowerCase();
        this.setState({input: value}); 
    }

    onMultipleInputChange(e) { 
        this.setState({quantityField: e.target.value}); 
    }
  
    handleAdd() {
        let multiplier = this.state.quantityField;
        let nominee = this.state.input;
        nominee = nominee.charAt(0).toUpperCase() + nominee.slice(1);
        this.handleNominees(nominee, multiplier);
        this.setState({input : ''});
        this.setState({quantityField: ''});
    }

    // Saves nominees and votes entered by the input field to Firebase
    handleNominees(nominee, multiplier) {
        const nomineeName = nominee;
        let nomineeMultiplier = "";

        if (multiplier !== "") {
            nomineeMultiplier = parseInt(multiplier);
        } else {
            nomineeMultiplier = 1;
        }

        let writeInNom = fbRef.database().ref().push();

        writeInNom.set({
            name: nomineeName
        });

        for (var i = 0; i < nomineeMultiplier; i++) {
            let newChildRef = fbRef.database().ref(writeInNom.key + '/votes/').push();
            newChildRef.set({
                plus_one: true
            });
        }
    }
  
    handleOnKeyPress (e) {
        if(e.charCode === 13) {
            this.handleAdd();
        }
    }
  
    // select winner and save winner and all nominees to DynamoDB
    handleWinner (e) {
        e.target.blur();
        this.setState({
            input: '',
            labelButton: "Start Again"
        });

        const nominees = this.state.nominees;
    
        let nomLength = nominees.length;
        let timeMultiplier = 1;

        this.handleAudio(); //audio for halloween
    
        this.closeVoting();
    
        while(nomLength > 1) {
 
            setTimeout(() => {
              this.removeNom(Math.floor(Math.random()*(this.state.nominees.length)))
            }, 500*timeMultiplier);
        
            timeMultiplier++;
            nomLength--;

            if (nomLength === 1) {
              setTimeout(() => {
                const winner =  this.state.nominees[0];
                console.log(winner);

                db.addNomineesToDb(nominees, winner).then((data) => {
                    this.setState({
                        winner: winner,
                        nominees: [],
                        timesOfNomination: [],
                        winnerWins: data.wins,
                        winnerNominations: data.nominations
                    });
                    this.resetVotesFB();
                });
                }, 500*timeMultiplier);
            }
        }
    }
  
    handleAudio() {
        let audio = new Audio(mp3Audio);
        audio.play();
    }

    startAgain(e) {
        e.target.blur();

        this.resetVotesFB();
        
        this.setState({
            winner: "",
            nominees: [],
            timesOfNomination: [],
            labelButton: "CRUSHING IT!",
            winnerWins: "",
            winnerNominations: ""
        });
    } 

    //Reset votes in firebase DB
    resetVotesFB() {
        let fbObj = fbRef.database().ref();

        fbObj.once('value', snapshot => {
            snapshot.forEach((childSnapshot) => {
                childSnapshot.ref.child("votes").remove();
            });
        });
    }
  
    closeVoting() {
        let voteSessRef = fbRef.database().ref('/_voteSession/');
        voteSessRef.set({
            isOpen: false
        });
    }

    // reset votes and start listening. 
    resetStart() {
        let fbObj = fbRef.database().ref();

        fbObj.once('value').then( snapshot => {
            return snapshot.forEach((childSnapshot) => {
                childSnapshot.ref.child("votes").remove();
            });

        })
        .then(() => {
            this.startListening()
        });
    
        this.closeVoting();
    }

    // Listen for votes added to Firebase by phone
    startListening() {
        const refObj =  fbRef.database().ref();

        refObj.on('value', snapshot => {

            let nomineesCopy = [];

            let timesOfNominationCopy = this.state.timesOfNomination;

            for (var i = 0; i < timesOfNominationCopy.length; i++) {
                timesOfNominationCopy[i].times = 0;
            }

            snapshot.forEach((child) => {   
                if ( child.val().votes ) {

                    let voteCount =  Object.keys(child.val().votes).length;
                    let voteName = child.val().name;
                    let voteNew = true;
          
                    for (var i = 0; i < timesOfNominationCopy.length; i++) {

                        // if nominee already exists, increase vote count
                        if (timesOfNominationCopy[i].name === voteName) {
                            voteNew = false;

                            timesOfNominationCopy[i].times += voteCount;
                        }
                    }
                    
                    // if new nominee, add name and vote count
                    if (voteNew) {  
                        timesOfNominationCopy.push({name: voteName, times: voteCount}); 
                    } 
          

                    for (var i = 0; i < voteCount; i++) {
                        nomineesCopy.push(voteName);
                    }
                }
            });
      
            this.setState({timesOfNomination: timesOfNominationCopy});

            this.setState({
                nominees: nomineesCopy
            });
        });
    }
 
    removeNom(index) {
        let noms = [...this.state.nominees]; 
        let indexName = noms[index];

        if (index !== -1) {
            noms.splice(index, 1);
            this.setState({nominees: noms});
        }

        //remove from timesOfNomination
        for (let [ i, v] of this.state.timesOfNomination.entries()) {
            if (v.name === indexName) {
                if(v.times === 1) {
                     return this.setState({timesOfNomination: this.state.timesOfNomination.filter(i => i.name !== indexName)});
                } else {
                    return this.setState(prevState => {
                        const current = {...prevState.timesOfNomination};
                        current[i].times = v.times -1;
                    });
                }
            }
        }
    }

    render () {
        let formInputs;
        let formButtons;
        let nomineeList;
        let winnerContent;

        if(!this.state.winner) {
            formInputs = <Inputs
                            input={this.state.input}
                            onKeyPress={this.handleOnKeyPress.bind(this)}
                            onChange={this.onInputChange.bind(this)}
                            quantityChange={this.onMultipleInputChange.bind(this)}/>
        
            formButtons = <Buttons
                            label = {this.state.labelButton}
                            onClick={this.handleWinner.bind(this) }  />
        
            nomineeList = <Nominee
                            timesOfNomination={this.state.timesOfNomination} 
                            clickFn={(i) => this.removeNom(i)} />
        } else {
            formButtons = <Buttons
                            label = {this.state.labelButton}
                            onClick={this.startAgain.bind(this)}/>
        
            winnerContent = <Winner 
                            winner={this.state.winner}
                            wins={this.state.winnerWins}
                            nominations={this.state.winnerNominations} />
        }

        return (
            <div className="container">
                <div className="forms">
                    <h1>PNI Creative <br/> Crushing it! Award</h1>
                    <div>
                        {formInputs}
                        {formButtons}
                    </div>
                </div>
                <div className="content">
                    {nomineeList}
                    {winnerContent}
                </div>
            </div>
        )
    }
}

export default App;
