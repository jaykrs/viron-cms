export default function RichText({ heading, paragraphs = [] }) {
  return (
    <section className="block-rich-text">
      <div className="block-rich-text__inner">
        {heading && <h2 className="block-rich-text__heading">{heading}</h2>}
        <div className="block-rich-text__body">
          {paragraphs.map((p, i) => (
            <p key={i} className="block-rich-text__paragraph">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
