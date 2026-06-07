import React from 'react';

/**
 * Transforma URLs em texto em elementos clicáveis
 * Suporta http e https
 */
export const linkifyText = (text: string): React.ReactNode => {
  if (!text) return text;
  
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const parts = text.split(urlRegex);
  
  if (parts.length === 1) return text;
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

/**
 * Renderiza texto com suporte a imagens markdown e links
 * Formato de imagem: ![alt](url)
 */
export const renderTextWithImagesAndLinks = (text: string): React.ReactNode => {
  if (!text) return text;
  
  // Regex para imagens markdown: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = imageRegex.exec(text)) !== null) {
    // Adiciona texto antes da imagem (com links)
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      elements.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {linkifyText(textBefore)}
        </React.Fragment>
      );
    }
    
    // Adiciona a imagem
    const [, alt, url] = match;
    elements.push(
      <img
        key={`img-${match.index}`}
        src={url}
        alt={alt || 'Imagem'}
        className="max-w-full h-auto rounded-md my-2 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Adiciona texto restante (com links)
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    elements.push(
      <React.Fragment key={`text-${lastIndex}`}>
        {linkifyText(textAfter)}
      </React.Fragment>
    );
  }
  
  return elements.length > 0 ? elements : linkifyText(text);
};
