import { getFFmpeg } from '@/lib/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { FileVideo, Upload } from 'lucide-react';
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { api } from '@/lib/axios';

type Status = 'Waiting' | 'Converting' | 'Uploading' | 'Transcripting' | 'Success' | 'Error';

const statusMessages = {
  Converting: 'Converting vídeo...',
  Uploading: 'Uploading...',
  Transcripting: 'Transcripting vídeo...',
  Success: 'Success!...',
  Error: 'Error!...',
};

interface VideoFormProps {
  onUploadedVideo: (id:string)=> void
}

export function VideoForm(props: VideoFormProps) {
  //useState => alteração na interface através de u a mudança de uma variável
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('Waiting');
  const promptInputref = useRef<HTMLTextAreaElement>(null);

  const handleFileSelected = (ev: ChangeEvent<HTMLInputElement>) => {
    const { files } = ev.currentTarget;
    if (!files) {
      return;
    }
    const selectedFile = files[0];

    setVideoFile(selectedFile);
  };

  const convertVideoToAudio = async (video: File) => {
    console.log('Conversion started...');
    const ffmpeg = await getFFmpeg();
    console.log('await getFFmpeg();');
    await ffmpeg?.writeFile('input.mp4', await fetchFile(video));
    console.log('await ffmpeg?.writeFile(');

    ffmpeg.on('progress', (progress) => {
      console.log('Convert progress:' + Math.round(progress.progress * 100));
    });
    console.log('ffmpeg , (progress) => {');
    ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ]);
    console.log('ffmpeg.exec([');

    const data = await ffmpeg.readFile('output.mp3');
    console.log('await ffmpeg.readFile');

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' });
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    });

    console.log('Conversion success');
    return audioFile;

    // ffmpeg.on('log', log => {
    //   console.log(log)
    // });
  };

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    console.log('entrou na handleUploadVideo');
    event.preventDefault();
    const prompt = promptInputref.current?.value;
    if (!videoFile) {
      return;
    }
    setStatus('Converting');

    //converter from audio to video
    const audioFile = await convertVideoToAudio(videoFile);

    const data = new FormData();

    data.append('file', audioFile);

    setStatus('Uploading');

    const response = await api.post('/videos', data);

    const videoId = response.data.video.id;

    setStatus('Transcripting');

    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    });

    console.log('transcription success');
    setStatus('Success');
    props.onUploadedVideo(videoId);
  };

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null;
    }
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className='space-y-6'>
      <label
        htmlFor='video'
        className='relative cursor-pointer text-sm border-dashed gap-3 items-center justify-center p-2 border w-full flex rounded-md aspect-video text-muted-foreground hover:bg-primary/10 transition-all duration-200'
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className='pointer-events-none absolute inset-0'
          />
        ) : (
          <>
            <FileVideo className='h-4 w-4' />
            Select a video...
          </>
        )}
      </label>
      <input
        type='file'
        id='video'
        accept='video/mp4'
        className='sr-only'
        onChange={handleFileSelected}
      />

      <Separator />

      <div className='space-y-2'>
        <Label htmlFor='transcription-prompt'>Transcription prompt</Label>
        <Textarea
          ref={promptInputref}
          disabled={status !== 'Waiting'}
          id='transcription-prompt'
          className='h-24 leading-relaxed resize-none'
          placeholder="Put some key words that make sense to what's on on the video and split them with comma (,)"
        />
      </div>
      <Button
        data-success={status === 'Success'}
        disabled={status !== 'Waiting'}
        className='text-slate-300 w-full hover:text-white transition-all duration-300 data-[success=true]:bg-emerald-500'
      >
        {status === 'Waiting' ? (
          <>
            Load Video
            <Upload className='ml-2 w-4 h-4' />
          </>
        ) : (
          statusMessages[status]
        )}
      </Button>
    </form>
  );
}
