import React from "react";
import Dropzone from "react-dropzone";
import ProgressBar from "../progressBar/ProgressBar.jsx";
//import {safeCB} from "../../../lib/callbacks.js";
//import Logger from "../../../api/logs/methods.js";

const safeCB = (cb) => (typeof cb === 'function') ? cb : () => undefined

const Preview = (props) => (
  (props.file) ?
    <div className="dropZonePreview">
      {props.isImage ?
        <img style={{width: '196px', height: '196px'}} src={props.file.preview}/>
        : <p className="label">{props.label}</p>}
    </div> :
    <div className="dropZonePreview">
      <p className="label">{props.text}</p>
    </div>
);

export default class DropZone extends React.Component {
  constructor(props) {
    super(props);
    this.maxSize = (typeof props.maxSize === 'number') ? props.maxSize : Number.MAX_VALUE;
    this.text = props.text || `Drop file here. Max ${this.maxSize}.`;
    this.onDropCB = safeCB(props.onDrop);
    this.onDone = safeCB(props.onDone);
    this.onStart = safeCB(props.onStart);
    this.onProgress = safeCB(props.onProgress);
    this.uploader = new Slingshot.Upload(props.uploaderDirective);

    this.state = {
      file: null,
      fileId: null,
      progress: 0,
      hideProgressBar: true,
      label: '',
      showingPreview: false,
      isImage: false,
      text: ''
    };
    if (props.preview !== undefined) {
      this.state.file = {preview: props.preview};
      this.state.showingPreview = true;
      this.state.isImage = props.isImage;
      this.state.text = props.text;
      this.state.label = props.label;
    }

  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.preview !== undefined) {
      this.setState({
        isImage: nextProps.isImage || false,
        file: {preview: nextProps.preview},
        showingPreview: true,
        text: nextProps.text,
        label: nextProps.label
      }, (value)=>console.log(arguments))
    }
  }

  componentDidMount() {
    require("./dropZone.scss");
  }

  resetState() {
    this.setState({
      file: null,
      fileId: null,
      progress: 0,
      hideProgressBar: true,
      label: '',
      showingPreview: false
    });
  }

  validateFile(file, cb) {
    cb = safeCB(cb);
    if (file === undefined) {
      return cb('Error: No file found!');
    }
    if (file.size > this.maxSize) {
      return cb(`File: ${file.name} size: ${file.size} > max: ${this.maxSize} bytes`);
    }
    cb();
  }

  onDrop(files) {
    // Logger.trace('DropZone.onDrop', files[0]);
    let file = files[0];
    let resetState = this.resetState.bind(this);
    resetState();

    let uploadCB = (error, url) => {
      // Logger.trace('DropZone.uploadCB', {error, url});
      if (error) {
        this.onDropCB(`There was an error uploading: "${file.name}", please try again.`);
        resetState();
      } else {
        // Logger.trace('DropZone.uploadCB: Meteor.call("saveUpload", url, cb)', {url});
        Meteor.call("saveUpload", url, (error, result)=> {
          // Logger.trace('Meteor.call("saveUpload", url, cb) {error, result}', {error, result});
          if (error) {
            this.onDropCB(`There was an error saving the uploading: "${file.name}", please try again.`);
            // todo: clean up after AWS after failed DB save.
            console.log('todo: clean up after AWS after failed DB save.');
          } else {
            this.setState({fileId: result});
            this.onDropCB(undefined, url);
          }
        });
      }
    };

    let isValidCB = (error) => {
      if (error) {
        resetState();
        this.onDropCB(error);
      } else {
        this.setState({
          file: file,
          showingPreview: true,
          isImage: file.type.match(/image.*/),
        });
        this.uploader.send(file, uploadCB);
      }
    };

    this.validateFile(file, isValidCB);

    // Track Progress, onDone
    this.progressTracker = Tracker.autorun(() => {
      if (!isNaN(this.uploader.progress())) {
        let progress = this.uploader.progress() * 100;

        // onProgress
        this.setState({
          progress,
          label: `Uploading: ${this.state.file.name} - ${Math.round(progress)}% complete.`,
          hideProgressBar: (progress === 100)
        });
        this.onProgress(progress);

        // onStart
        if (progress === 0) {
          this.onStart();
        }

        // onDone
        if (progress === 100) {
          this.onDone();
          this.progressTracker.stop();
        }
      }
    });
  }

  render() {
    return (
      <Dropzone className="dropZoneContainer" multiple={false} onDrop={this.onDrop.bind(this)}
                accept={this.props.accept}>
        {(this.state.showingPreview) ? <div className="cancelButton" onClick={(event)=> {
          event.stopPropagation();
          this.resetState();
        }}>
          <span className="cbInner">X</span>
        </div> : ''}
        <Preview label={this.state.label} file={this.state.file} isImage={this.state.isImage} text={this.state.text}/>
        <ProgressBar label={this.state.label} completed={this.state.progress} hidden={this.state.hideProgressBar}/>
      </Dropzone>
    );
  }
}
