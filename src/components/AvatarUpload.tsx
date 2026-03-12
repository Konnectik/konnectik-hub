import { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarUpload } from '@/hooks/use-avatar-upload';

const AvatarUpload = () => {
  const { profile } = useAuth();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be under 2MB');
      return;
    }
    await uploadAvatar(file);
    // Force refresh profile by reloading
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="h-20 w-20">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="bg-accent text-accent-foreground text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button
          size="icon"
          variant="outline"
          className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Camera size={14} />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
    </div>
  );
};

export default AvatarUpload;
