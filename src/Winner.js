import React from 'react';

class Winner extends React.Component {
    render () {
        return (
            <div className="show winner-container">
                {
                    [...Array(10)].map ( (i) => {
                        return <div key={i} className="confetti"></div>
                    })

                }
                <p>This week's winner is:</p>
                <p className="animated fadeInUp winner">{this.props.winner}!</p>
                <p className="animated fadeInDown delay-1s">This is the <span id="w-count"></span> win for {this.props.winner} and <span id="w-nom"></span> nomination.</p>
          </div>
        )
    }
}

export default Winner;
