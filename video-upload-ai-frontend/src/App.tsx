import { Github, Wand } from 'lucide-react';
import { VideoForm } from './components/VideoForm';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { Separator } from './components/ui/separator';
import { Slider } from './components/ui/slider';
import { Textarea } from './components/ui/textarea';
import { PromptSelect } from './components/PromptSelect';
import { useState } from 'react';
import { useCompletion } from 'ai/react';

export function App() {
  const [temperature, setTemperature] = useState(0.5);
  const [videoId, setVideoId] = useState<string | null>(null);

  const {
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    completion,
    isLoading,
  } = useCompletion({
    api: 'http://localhost:3333/ai/generate-completion',
    body: {
      videoId,
      temperature,
    },
    headers: {
      'Content-type': 'application/json',
    },
  });

  return (
    <div className='min-h-screen flex flex-col'>
      <header className='px-6 py-3 flex items-center justify-between border-b'>
        <h1 className='text-xl front-bold'>upload.ai</h1>
        <div className='flex items-center gap-3'>
          <span className='text-muted-foreground'>
            Developed on Rocketseat's NLW 🔥
          </span>
          <Separator orientation='vertical' className='h-6' />
          <Button variant='outline'>
            <Github className='w-4 h-4 mr-2' />
            GitHub
          </Button>
        </div>
      </header>
      <div className='flex-1 p-6 flex gap-6'>
        <main className='flex flex-col flex-1 gap-4'>
          <div className='grid grid-rows-2 flex-1 gap-4'>
            <Textarea
              value={input}
              onChange={handleInputChange}
              className='resize-none p-4 leading-relaxed'
              placeholder='Write something for the AI..'
            />
            <Textarea
              className='resize-none p-4 leading-relaxed'
              placeholder='AI result..'
              value={completion}
              readOnly
            />
          </div>
          <p className='text-sm text-muted-foreground'>
            Remember, you can add the{' '}
            <code className='text-amber-500'>transcription</code> variable in
            your prompt to add the transcription content of the uploaded video
          </p>
        </main>

        <aside className=' w-80 space-y-4'>
          <VideoForm onUploadedVideo={setVideoId} />
          <PromptSelect onPromptSelected={setInput} />

          <Separator />

          <form onSubmit={handleSubmit} className='space-y-4'>
            <Label>Model</Label>
            <Select disabled defaultValue='gpt3.5'>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='gpt3.5'>GPT 3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
            <span className='block text-xs text-muted-foreground italic'>
              New options soon..
            </span>
            <Separator />
            <Label>Temperature</Label>
            <Slider
              className='cursor-pointer'
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
            />
            <div className='space-y-4'>
              <span className='block text-xs text-muted-foreground italic leading-relaxed'>
                Higher values have more creative results, but it takes more
                errors as well.
              </span>
            </div>
            <Separator />
            <Button
              disabled={isLoading}
              type='submit'
              className='text-slate-300 w-full hover:text-white transition-all duration-300'
            >
              Run
              <Wand className='ml-2 w-4 h-4 ' />
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
