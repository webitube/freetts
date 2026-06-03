# Function Header Templates: Python, C#, and Typescript/Javascript


## Python Function Header Template

```Python-GoogleStyle
def calculate_area(width: float, height: float) -> float:
    """Compute the area of a rectangle.

    Args:
        width: The width of the rectangle.
        height: The height of the rectangle.

    Returns:
        The calculated area.
    """
    return width * height
```


## C# Function Header Template

```Csharp-XmlStyle
namespace GeometryApp
{
    /// <summary>
    /// Represents a utility class for shape calculations.
    /// </summary>
    public class RectangleMath
    {
        /// <summary>
        /// Compute the area of a rectangle.
        /// </summary>
        /// <param name="width">The width of the rectangle.</param>
        /// <param name="height">The height of the rectangle.</param>
        /// <returns>The calculated area as a double.</returns>
        /// <exception cref="System.ArgumentOutOfRangeException">
        /// Thrown when width or height is less than or equal to zero.
        /// </exception>
        public double CalculateArea(double width, double height)
        {
            if (width <= 0 || height <= 0)
            {
                throw new System.ArgumentOutOfRangeException("Dimensions must be positive.");
            }
            return width * height;
        }
    }
}
```


## Typescript/Javascript Function Header Template

```Typescript-TsDocStyle
/**
 * Utility functions for geometric calculations.
 */
export class RectangleMath {
  /**
   * Compute the area of a rectangle.
   *
   * @param width - The width of the rectangle.
   * @param height - The height of the rectangle.
   * @returns The calculated area.
   * 
   * @throws {@link RangeError} Thrown if width or height is negative.
   */
  public calculateArea(width: number, height: number): number {
    if (width <= 0 || height <= 0) {
      throw new RangeError("Dimensions must be positive.");
    }
    return width * height;
  }
}
```
