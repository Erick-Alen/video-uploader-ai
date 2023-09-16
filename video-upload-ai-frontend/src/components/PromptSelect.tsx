import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { api } from '@/lib/axios';


interface Prompt {
  id:string,
  title:string,
  template:string,
}

interface PromptSelectProps {
  onPromptSelected: (template: string)=> void
}

export const PromptSelect = ( props:PromptSelectProps ) => {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);

  useEffect(() => {
    api.get('/prompts').then((response) => {
      setPrompts(response.data);
    });
  }, []);

  const handlePromptSelection = (promptId: string) => {
    const selectedPrompt = prompts?.find((prompt) => prompt.id == promptId);
    if (!selectedPrompt) {
      return;
    }
    props.onPromptSelected(selectedPrompt.template)
  };

  return (
    <Select onValueChange={handlePromptSelection}>
      <SelectTrigger>
        <SelectValue placeholder='Select a prompt' />
      </SelectTrigger>
      <SelectContent>
        {prompts?.map((prompt) => (
          <SelectItem key={prompt.id} value={prompt.id}>
            {prompt.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
