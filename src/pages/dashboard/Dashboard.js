import React, { useState, useEffect, useReducer, useMemo } from "react";
import { Row, Col, Table } from "reactstrap";
import Tesseract from 'tesseract.js'
import Webcam from "react-webcam";
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css';
import 'filepond/dist/filepond.min.css';

import Widget from "../../components/Widget";

import s from "./Dashboard.module.scss";

const { createWorker, createScheduler } = Tesseract;

const videoConstraints = {
  facingMode: "user"
};
let timerId = null;

const Dashboard = ({}) => {
  const worker = createWorker({});
  const [ message, setMessage ]= useState('')
  const [ errorOCR, setErrorOCR ]= useState(false)
  const [ cameraEnabled, enable ]= useState(true)
  const webcamRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  let pondRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const [capturing, setCapturing] = React.useState(false);
  const [recordedChunks, setRecordedChunks] = React.useState([]);

  const scheduler = useMemo(() => {
    const instance = createScheduler()
    return instance
  }, [])

  const streamCamVideo = () => {
    var constraints = { audio: true, video: { width: 1280, height: 720 } };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(mediaStream) {
        var video = document.querySelector("video");

        video.srcObject = mediaStream;
        video.onloadedmetadata = function(e) {
          video.play();
        };

      video.addEventListener('play', () => {
        timerId = setInterval(doOCR, 2000);
      });

      video.addEventListener('pause', () => {
        clearInterval(timerId);
      });

      })
      .catch(function(err) {
        console.log(err.name + ": " + err.message);
      }); // always check for errors at the end.
  }

  const ocrFile = async (file) => {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwyzABCDEFGHIJKLMNOPQRSTUVWYZ0123456789',
    });
    const { data: { text } } = await worker.recognize(file.file);
    setMessage(text)
  }

  const doOCR = async () => {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789',
    });

      const video = document.querySelector("video");
      canvasRef.current.width = 640;
      canvasRef.current.height = 360;
      canvasRef.current.getContext('2d').drawImage(video, 0, 0, 640, 360);
      const start = new Date();
      const { data: { text } } = await worker.recognize(canvasRef.current);
    if(message.split('\n').length === 3)
      setMessage(text)
    else setErrorOCR(true)
    };

 const handleStartCaptureClick = React.useCallback(() => {
    setCapturing(true);
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
      mimeType: "video/webm"
    });
    mediaRecorderRef.current.addEventListener(
      "dataavailable",
      handleDataAvailable
    );

    mediaRecorderRef.current.start();
  }, [webcamRef, setCapturing, mediaRecorderRef]);

  const handleDataAvailable = React.useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const handleStopCaptureClick = React.useCallback(() => {
    mediaRecorderRef.current.stop();
    setCapturing(false);
  }, [mediaRecorderRef, webcamRef, setCapturing]);

  const handleDownload = React.useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: "video/webm"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = "react-webcam-stream-capture.webm";
      a.click();
      window.URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  }, [recordedChunks]);

    const videoConstraints = {
      facingMode: "user"
    };

  return (
      <div className={s.root}>
        <Row>
          <Col sm={12}>
            <Row>
              <Col sm={12}>
            <Widget
              customDropDown
              title={<p className={"fw-bold"}>C&aacute;mara</p>}
            >
              { cameraEnabled  && (
                <>
                  <video
                    autoPlay={true}
                    muted
                    preload width="640" height="360"
                    id="videoElement" controls></video> 
                  <button onClick={streamCamVideo}>Start streaming</button>
                </>
              )}
            </Widget>
          </Col>
              <Col sm={12}>
                <button onClick={() => {
                  enable(!cameraEnabled)
                }}>Activar / Desactivar</button>
              </Col>
              <Col sm={12}>
                <button onClick={handleStartCaptureClick}>Capturar video</button>
          </Col>
           </Row>
          </Col>
          <Col sm={12} lg={4}>
            <Widget
              customDropDown
              title={<p className={"fw-bold"}>Procesamiento</p>}
            >
              <canvas ref={canvasRef}/>
              {errorOCR ? 'Error': message}

            </Widget>
          </Col>
          <Col sm={12}>
            <Widget
              customDropDown
              title={<p className={"fw-bold"}>Procesamiento</p>}
            >
              <FilePond ref={ref => pondRef = ref}
                                onaddfile={(err,file) =>{
                                    ocrFile(file);

                                }}
                                onremovefile={(err,file) =>{
                                  setMessage('')
                                }}
                                />

            </Widget>
          </Col>
        </Row>
      </div>
  )
};

export default React.memo(Dashboard);
