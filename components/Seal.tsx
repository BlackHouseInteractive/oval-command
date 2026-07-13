interface SealProps {
  size?: number
  className?: string
}

/**
 * The presidential seal emblem — sourced from the studio's actual logo
 * artwork (public/oval-command-seal.svg), not hand-coded geometry. Uses
 * currentColor for both the eagle and the ring so it still inherits
 * color from a wrapping `text-[var(--color-brass)]` class the way the
 * rest of the app already relies on.
 */
export function Seal({ size = 32, className }: SealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1254 1254"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M252.5 310.5L274 409L351 451.5L237.5 422L274 498.5L351 520.5H237.5L289 585H374L274 612L327.5 661.5L405.5 639.5L318 688.5L374 725L442 688.5L389.5 743L442 760L487 716.5L461.5 772H511L539 733.5V772L474.5 836.5L452.5 844.5L393.5 833.5L385 885L409.5 859L428 863L421 866L409.5 893.5L428 924L432.5 889.5L449.5 879L474.5 902V933L497 898.5L474.5 870.5L490.5 863H511L568.5 824.5L513.5 935L554.5 979.5L589 885L572.5 985.5L625.5 1040.5L678 985.5L664.5 885L699 979.5L740 933L683 824.5L740 863H761L779 870.5L756 898.5L779 933V902L803 879.5L819.5 891L823.5 923.5L841.5 891L832 866.5L827 863L841.5 859L868 885L855.5 830.5L803 841.5L779 837L714 773V728.5L740 773H795.5L764.5 717L811.5 761.5L864 742L811.5 688.5L876 725L935 691.5L847 640L926 660.5L983.5 611.5L876 585H964.5L1012.5 521H901.5L980 500L1017 424.5L904.5 453.5L980 409.5L1001 310L742 474.5L750 556L699.5 594.5L666 515.5L686 503.5H703.5L715.5 509V494.5L709 481L699.5 474.5L681.5 471L677 460.5L608 457L588 494.5L553.5 594.5L505 556L518 471L252.5 307.5V310.5ZM675.5 476.5H643L668.5 487L675.5 476.5Z"
        fill="currentColor"
      />
      <path
        d="M627 103.5C909.827 103.5 1138.5 337.992 1138.5 626.5C1138.5 915.008 909.827 1149.5 627 1149.5C344.173 1149.5 115.5 915.008 115.5 626.5C115.5 337.992 344.173 103.5 627 103.5Z"
        stroke="currentColor"
        strokeWidth="31"
      />
    </svg>
  )
}
