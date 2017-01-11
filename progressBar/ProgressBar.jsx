import React from "react";

export default class ProgressBar extends React.Component {
  render() {
    require('./progressBar.scss');
    var completed = +this.props.completed;
    if (completed < 0) {completed = 0}
    if (completed > 100) {completed = 100}

    var style = {
      backgroundColor: this.props.color || '#0BD318',
      width: completed + '%',
      height: this.props.height || 10
    };

    var isHidden = (this.props.hidden) ? 'progressbar-fadeOut' : '' ;

    return (
      <div className={`progressbar-container ${isHidden}`}>
        <div className={`progressbar-progress`} style={style}>{this.props.children}</div>
      </div>
    );
  }
}
