'use client';
import React, { useState, useEffect, useRef } from 'react';
import '../styles/styles.css';

const IndexPage = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [videoDuration, setVideoDuration] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadLink, setDownloadLink] = useState('');
    const [speedFactor, setSpeedFactor] = useState(1);
    const ffmpegRef = useRef(null);

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        setVideoFile(file);
        
        // Create a video element to extract the duration
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.onloadedmetadata = () => {
            console.log('Video duration:', videoElement.duration);
            setVideoDuration(videoElement.duration);
        };
        videoElement.src = URL.createObjectURL(file);
        console.log("Video uploaded...");
    };

    useEffect(() => {
        const loadFFmpeg = async () => {
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { toBlobURL } = await import('@ffmpeg/util');
            const ffmpeg = new FFmpeg();
            ffmpegRef.current = ffmpeg;

            ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg log:', message);
                const timeMatch = message.match(/time=\s*(\d+:\d+:\d+\.\d+)/);
                if (timeMatch) {
                    const [hours, minutes, seconds] = timeMatch[1].split(':').map(parseFloat);
                    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                    console.log('Total seconds processed:', totalSeconds);
                    if (videoDuration) {
                        console.log(speedFactor)
                      let progressValue;
                      if (speedFactor === 0.5) {
                          progressValue = (totalSeconds / (videoDuration / 0.5)) * 100;
                      } else if (speedFactor === 2) {
                          progressValue = (totalSeconds / (videoDuration)) * 100;
                      }
                      else{
                        progressValue = (totalSeconds / (videoDuration)) * 100;
                      }
                      console.log('Progress value:', progressValue);
                      setProgress(Math.min(progressValue, 100));
                  }
                }
            });

            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            setLoaded(true);
        };

        loadFFmpeg();
    }, [videoDuration, speedFactor]);

    const triggerDownload = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const transcode = async (speed) => {
        setProcessing(true);
        setProgress(0);
        console.log(speed);
        console.log(speedFactor);
        setSpeedFactor(speed);
        console.log(speedFactor);
        try {
            const ffmpeg = ffmpegRef.current;
            const { fetchFile } = await import('@ffmpeg/util');
            await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

            await ffmpeg.exec(['-i', 'input.mp4', '-filter:v', `setpts=${1/speed}*PTS`, 'output.mp4']);
            
            const data = await ffmpeg.readFile('output.mp4');
            const videoURL = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            setDownloadLink(videoURL);

            // Automatically trigger download
            triggerDownload(videoURL, 'output.mp4');
        } catch (error) {
            console.error('Error during FFmpeg command execution:', error);
        }
        setProcessing(false);
        setProgress(100);
    };

    return (
        <div className="container">
            <h1>Change Video Speed</h1>
            <div className="upload-container">
                <label htmlFor="video">Upload .MP4 file:</label>
                <input className="upload-btn" type="file" id="video" accept=".mp4" onChange={handleVideoUpload} />
            </div>
            {loaded && (
                <div className="actions">
                    {processing ? (
                        <div>
                            <div className="loader">Processing...</div>
                            <div className="progress-bar">
                                <div className="progress" style={{ width: `${progress}%` }}>
                                    {Math.round(progress)}%
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <button className="merge-btn" onClick={() => transcode(0.5)}>0.5x Speed</button>
                            <button className="merge-btn" onClick={() => transcode(2)}>2x Speed</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IndexPage;
