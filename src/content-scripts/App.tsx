import { ReactShadow } from '~/components/ReactShadow'

export function App() {
  if (IS_PROD) return null

  return (
    <>
      {/* FIXME: remove dev test code */}
      <ReactShadow>
        <div className="bg-red z-max fixed top-0 left-0 size-20">
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. A ut eveniet
          vero magni nobis. Fuga corporis rem sint. Tempora tenetur esse et,
          dignissimos minima exercitationem animi porro qui at rem?
        </div>
      </ReactShadow>
    </>
  )
}
