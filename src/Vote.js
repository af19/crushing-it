import React from 'react'
import fbRef from './databaseRT';

class Vote extends React.Component {
  
  constructor(props){
    super(props);
    this.state = {
      data: [],
      myVotes: JSON.parse(localStorage.getItem('myVotes')) || [],
      startVoting: null,
      startTime: parseInt(localStorage.getItem('startTime')) || 0
    }
  }

  writeUserData(userName, userID) {
    var newChildRef = fbRef.database().ref(userID + '/votes/').push();
    newChildRef.set({
      plus_one: true
    });
 
    this.setState({
      myVotes: [...this.state.myVotes, userName]    
    },
    () => {
      localStorage.setItem('myVotes', JSON.stringify(this.state.myVotes));
    })
  }

  componentDidMount() {
    var startVoteRef = fbRef.database().ref('/_voteSession');
    startVoteRef.on('value', snapshot => {
      this.setState({startVoting: snapshot.val().isOpen});

      if (snapshot.val().startTime > this.state.startTime) {
        var timestamp = snapshot.val().startTime;
        this.setState({startTime: timestamp, myVotes: []});
        localStorage.removeItem("myVotes");
        localStorage.setItem('startTime', timestamp.toString());
      }
    });

    var namesRef = fbRef.database().ref('/_lineup').orderByChild('name');
    namesRef.once('value', snapshot => {

      snapshot.forEach((childSnapshot) => {
        var childKey = childSnapshot.key;
        var childData = childSnapshot.val();

        this.setState(prevState => ({
          data: [...prevState.data, {id: childKey, name: childData.name}]
        }));
      });
    });
  }
	
  render() {
    const listItems = this.state.data.map((items, i) =>
        <button 
          key={i} 
          onDoubleClick={() => this.writeUserData(items.name, items.id)} 
          disabled={this.state.myVotes.includes(items.name) || this.state.myVotes.length >= 5}>{items.name} 
        </button>
      );
   const seeYouLater = <div className="vote-closed-wrapper"><img src="https://media.giphy.com/media/10WCpxxwoQ9dKM/giphy.gif"/></div>
   const voteCounter = <p>You have {5 - this.state.myVotes.length} votes remaining</p>
   
    return (
      <div className="vote-list">
        <header className="vote-header">
          {this.state.startVoting ? voteCounter : null}
        </header>
         {this.state.startVoting === true ? listItems : null}
         {this.state.startVoting === false ? seeYouLater : null}
      </div>
    );
  }
}

export default Vote